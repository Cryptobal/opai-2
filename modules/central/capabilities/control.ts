import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { estadoEfectivo } from "../domain";
import { PERMISO_ATENDER, uuidSchema } from "./esquemas";
import { PERMISO_GOBERNAR } from "./humano";
import { bloquearAlerta, cadenaDe, TRABAJO_REVISAR } from "./motor";
import { alertaVisible, registrarHecho } from "./util";

const salida = z.object({ id: uuidSchema, estado: z.string() });

export const alertasTomar = defineCapability({
  id: "central.alertas.tomar",
  descripcion:
    "Un operador toma una alerta: queda en atención a su nombre, la cadena se detiene y el agente deja de actuar en ella hasta que la devuelva.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R13: tomar el control es de personas.
  input: z.object({ id: uuidSchema }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Tomar una alerta es de una persona.");
    const visible = await alertaVisible(ctx, i.id);
    return ctx.transaccion(async (tx) => {
      const a = (await bloquearAlerta(ctx, tx, visible.id)) ?? visible;
      const desde = estadoEfectivo(a, new Date());
      if (["resuelta", "falsa_alarma"].includes(desde)) throw reglaDeNegocio("La alerta ya está cerrada.");
      if (a.tomadaPorId && a.tomadaPorId !== ctx.usuario!.id) throw reglaDeNegocio("Otra persona ya tomó esta alerta.");
      if (dryRun) return { id: a.id, estado: "en_atencion" };
      await tx.centralAlerta.update({
        where: { id: a.id },
        data: {
          estado: "en_atencion", tomadaPorId: ctx.usuario!.id, tomadaEn: new Date(), atencionPorId: ctx.usuario!.id,
          atencionVenceEn: null, pasoVenceEn: null, estadoPrevio: null, pospuestaHasta: null,
        },
      });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "tomada", estadoDesde: desde, estadoHacia: "en_atencion" });
      return { id: a.id, estado: "en_atencion" };
    });
  },
});

export const alertasDevolver = defineCapability({
  id: "central.alertas.devolver",
  descripcion:
    "Devuelve una alerta tomada: el agente vuelve a poder actuar y, si no se resuelve dentro del plazo de atención, la cadena sigue.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R13.
  input: z.object({ id: uuidSchema }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Devolver una alerta es de una persona.");
    const visible = await alertaVisible(ctx, i.id);
    return ctx.transaccion(async (tx) => {
      const a = (await bloquearAlerta(ctx, tx, visible.id)) ?? visible;
      if (!a.tomadaPorId) throw reglaDeNegocio("La alerta no está tomada.");
      if (a.tomadaPorId !== ctx.usuario!.id && !ctx.autorizar(PERMISO_GOBERNAR))
        throw reglaDeNegocio("Solo quien la tomó (o quien gobierna al agente) puede devolverla.");
      if (dryRun) return { id: a.id, estado: a.estado };
      const venceEn = new Date(Date.now() + (await cadenaDe(tx, a)).plazoMin * 60_000);
      await tx.centralAlerta.update({ where: { id: a.id }, data: { tomadaPorId: null, tomadaEn: null, atencionVenceEn: venceEn } });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "devuelta", estadoDesde: "en_atencion", estadoHacia: "en_atencion" });
      await ctx.trabajos.encolar(tx, { tipo: TRABAJO_REVISAR, payload: { alertaId: a.id }, programadoPara: venceEn, claveUnica: `${a.id}:${venceEn.toISOString()}` });
      return { id: a.id, estado: a.estado };
    });
  },
});

export const agentePausar = defineCapability({
  id: "central.agente.pausar",
  descripcion:
    "Pausa al agente de central en una instalación o en toda la empresa: deja de contactar, escalar y abrir alertas ahí hasta que una persona lo reanude.",
  permiso: PERMISO_ATENDER,
  input: z.object({ instalacionId: uuidSchema.nullable().default(null), motivo: z.string().trim().max(500).default("") }),
  output: z.object({ pausada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!i.instalacionId && !ctx.agente && !ctx.autorizar(PERMISO_GOBERNAR))
      throw prohibido("Pausar al agente en toda la empresa requiere gobernar al agente.");
    if (i.instalacionId) {
      if (ctx.alcance && !ctx.alcance.instalaciones.includes(i.instalacionId)) throw noEncontrado("La instalación");
      if (!(await ctx.db.instalacion.findFirst({ where: { id: i.instalacionId }, select: { id: true } }))) throw noEncontrado("La instalación");
    }
    const vigente = await ctx.db.centralPausa.findFirst({ where: { instalacionId: i.instalacionId, reanudadaEn: null }, select: { id: true } });
    if (vigente || dryRun) return { pausada: true };
    await ctx.transaccion((tx) =>
      tx.centralPausa.create({ data: { tenantId: ctx.tenantId, instalacionId: i.instalacionId, pausadaPorId: ctx.usuario?.id ?? null, motivo: i.motivo || null } }),
    );
    return { pausada: true };
  },
});

export const agenteReanudar = defineCapability({
  id: "central.agente.reanudar",
  descripcion: "Reanuda al agente de central en una instalación o en toda la empresa, después de una pausa.",
  permiso: PERMISO_GOBERNAR,
  soloPersonas: true, // R13: reanudar al agente es siempre de una persona.
  input: z.object({ instalacionId: uuidSchema.nullable().default(null) }),
  output: z.object({ pausada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const p = await ctx.db.centralPausa.findFirst({ where: { instalacionId: i.instalacionId, reanudadaEn: null } });
    if (!p) throw reglaDeNegocio("El agente no está en pausa ahí.");
    if (dryRun) return { pausada: false };
    await ctx.transaccion((tx) =>
      tx.centralPausa.update({ where: { id: p.id }, data: { reanudadaEn: new Date(), reanudadaPorId: ctx.usuario?.id ?? null } }),
    );
    return { pausada: false };
  },
});
