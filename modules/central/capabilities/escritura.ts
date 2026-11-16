import { z } from "zod";

import { defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { type Accion, estadoEfectivo, POSPONER_MAX_MIN, transicion } from "../domain";
import { PERMISO_ATENDER, uuidSchema } from "./esquemas";
import { TRABAJO_REVISAR } from "./motor";
import { alertaVisible, exigirPersona, registrarHecho } from "./util";

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
        await registrarHecho(ctx, tx, {
          alertaId: a.id,
          tipo: "reactivada",
          estadoDesde: "pospuesta",
          estadoHacia: desde,
          nota: `Venció el plazo: ${a.pospuestaHasta?.toISOString() ?? ""}`,
          sistema: true,
        });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: tipoHecho, estadoDesde: desde, estadoHacia: hacia, nota: i.nota ?? null });
      await ctx.eventos.emitir(tx, { tipo: evento, entidadTipo: "central.alerta", entidadId: a.id, payload: { desde, hacia } });
      if (hacia === "pospuesta" && i.hasta)
        await ctx.trabajos.encolar(tx, { tipo: TRABAJO_REVISAR, payload: { alertaId: a.id }, programadoPara: i.hasta, claveUnica: `${a.id}:${i.hasta.toISOString()}` });
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
  input: z.object({ id: uuidSchema, minutos: z.number().int().min(5).max(POSPONER_MAX_MIN), nota: nota(1).optional() }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, i, { dryRun }) =>
    posponer(ctx, { id: i.id, nota: i.nota, hasta: new Date(Date.now() + i.minutos * 60_000) }, dryRun),
});
