import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { type Accion, estadoEfectivo, POSPONER_MAX_MIN, transicion } from "../domain";
import { PERMISO_ATENDER, severidadSchema, uuidSchema } from "./esquemas";
import { alertaVisible, exigirPersona, ID_VISTA_PREVIA, registrarHecho } from "./util";

export const alertasAbrir = defineCapability({
  id: "central.alertas.abrir",
  descripcion:
    "Abre a mano una alerta en la central para una instalación (y opcionalmente el guardia involucrado), con título, descripción y severidad; queda nueva en la cola.",
  permiso: PERMISO_ATENDER,
  input: z.object({
    instalacionId: uuidSchema,
    personaId: uuidSchema.optional(),
    titulo: z.string().trim().min(3).max(140),
    descripcion: z.string().trim().max(2000).default(""),
    severidad: severidadSchema,
  }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.alcance && !ctx.alcance.instalaciones.includes(input.instalacionId))
      throw noEncontrado("La instalación");
    const inst = await ctx.db.instalacion.findFirst({ where: { id: input.instalacionId }, select: { id: true } });
    if (!inst) throw noEncontrado("La instalación");
    if (input.personaId) {
      const p = await ctx.db.persona.findFirst({ where: { id: input.personaId }, select: { id: true } });
      if (!p) throw noEncontrado("La persona");
    }
    if (dryRun) return { id: ID_VISTA_PREVIA };
    const creada = await ctx.transaccion(async (tx) => {
      const a = await tx.centralAlerta.create({
        data: {
          tenantId: ctx.tenantId,
          instalacionId: input.instalacionId,
          personaId: input.personaId ?? null,
          titulo: input.titulo,
          descripcion: input.descripcion,
          severidad: input.severidad,
          origen: "manual",
          abiertaPorId: ctx.usuario?.id ?? null,
        },
      });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "abierta", estadoDesde: null, estadoHacia: "nueva" });
      await ctx.eventos.emitir(tx, {
        tipo: "central.alerta.abierta",
        entidadTipo: "central.alerta",
        entidadId: a.id,
        payload: { instalacionId: a.instalacionId, severidad: a.severidad, origen: a.origen },
      });
      return a;
    });
    return { id: creada.id };
  },
});

const salida = z.object({ id: uuidSchema, estado: z.string() });

type Opciones = { id: string; nota?: string | undefined; hasta?: Date };

/** Aplica una acción de la máquina de estados (§6) con su hecho y su evento, o la simula. */
function cambiarEstado(accion: Accion, tipoHecho: string, evento: string, verbo: string) {
  return async (ctx: Parameters<typeof alertaVisible>[0], i: Opciones, dryRun: boolean) => {
    if (!ctx.usuario) throw prohibido("Se necesita un usuario responsable para atender una alerta.");
    exigirPersona(ctx, verbo);
    const a = await alertaVisible(ctx, i.id);
    const desde = estadoEfectivo(a, new Date());
    const hacia = transicion(desde, accion);
    if (!hacia) throw reglaDeNegocio(`No se puede ${verbo} una alerta en estado «${desde}».`);
    if (dryRun) return { id: a.id, estado: hacia };
    await ctx.transaccion(async (tx) => {
      const cierra = hacia === "resuelta" || hacia === "falsa_alarma";
      const { count } = await tx.centralAlerta.updateMany({
        where: { id: a.id, estado: a.estado, updatedAt: a.updatedAt },
        data: {
          estado: hacia,
          estadoPrevio: hacia === "pospuesta" ? desde : null,
          pospuestaHasta: hacia === "pospuesta" ? (i.hasta ?? null) : null,
          ...(cierra ? { notaCierre: i.nota ?? null, cerradaEn: new Date() } : {}),
          ...(hacia === "en_atencion" ? { notaCierre: null, cerradaEn: null } : {}),
        },
      });
      if (count !== 1) throw reglaDeNegocio("La alerta cambió mientras la atendías: vuelve a abrirla.");
      if (a.estado === "pospuesta" && desde !== "pospuesta")
        await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "reactivada", estadoDesde: "pospuesta", estadoHacia: desde });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: tipoHecho, estadoDesde: desde, estadoHacia: hacia, nota: i.nota ?? null });
      await ctx.eventos.emitir(tx, { tipo: evento, entidadTipo: "central.alerta", entidadId: a.id, payload: { desde, hacia } });
    });
    return { id: a.id, estado: hacia };
  };
}

const resolver = cambiarEstado("resolver", "resuelta", "central.alerta.resuelta", "resolver");
const falsa = cambiarEstado("falsa_alarma", "falsa_alarma", "central.alerta.resuelta", "marcar como falsa alarma");
const reabrir = cambiarEstado("reabrir", "reabierta", "central.alerta.reabierta", "reabrir");
const posponer = cambiarEstado("posponer", "pospuesta", "central.alerta.pospuesta", "posponer");

const nota = (min: number) => z.string().trim().min(min).max(1000);

export const alertasResolver = defineCapability({
  id: "central.alertas.resolver",
  descripcion: "Marca una alerta activa como resuelta, con una nota de qué se hizo; queda cerrada y en la bitácora.",
  permiso: PERMISO_ATENDER,
  input: z.object({ id: uuidSchema, nota: nota(3) }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, i, { dryRun }) => resolver(ctx, i, dryRun),
});

export const alertasFalsaAlarma = defineCapability({
  id: "central.alertas.falsa_alarma",
  descripcion: "Cierra una alerta como falsa alarma, con el motivo obligatorio; queda en la bitácora y se puede reabrir.",
  permiso: PERMISO_ATENDER,
  input: z.object({ id: uuidSchema, nota: nota(3).describe("Motivo de la falsa alarma.") }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, i, { dryRun }) => falsa(ctx, i, dryRun),
});

export const alertasReabrir = defineCapability({
  id: "central.alertas.reabrir",
  descripcion: "Reabre una alerta resuelta o cerrada como falsa alarma cuando hay evidencia nueva; vuelve a «en atención» con su historial.",
  permiso: PERMISO_ATENDER,
  input: z.object({ id: uuidSchema, nota: nota(3).describe("Qué evidencia nueva hay.") }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, i, { dryRun }) => reabrir(ctx, i, dryRun),
});

export const alertasPosponer = defineCapability({
  id: "central.alertas.posponer",
  descripcion: "Pospone una alerta activa por un plazo en minutos (hasta 24 horas): sale de la cola y vuelve sola a su estado al vencer.",
  permiso: PERMISO_ATENDER,
  input: z.object({ id: uuidSchema, minutos: z.number().int().min(5).max(POSPONER_MAX_MIN), nota: nota(0).optional() }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, i, { dryRun }) =>
    posponer(ctx, { id: i.id, nota: i.nota, hasta: new Date(Date.now() + i.minutos * 60_000) }, dryRun),
});
