import { z } from "zod";

import { puedeTransicionDte, proximaConsultaDteSii } from "@opai/domain";

import { defineTrabajo } from "../trabajos/registro";
import { adaptadorSiiDe } from "./adaptador-sii";
import { ambienteDe } from "./ventas-comun";
import type { Contexto } from "../types";

const payloadConsulta = z.object({ envioId: z.uuid() });

async function marcarAceptadoSii(
  ctx: Contexto,
  envioId: string,
  docId: string,
  intentos: number,
  glosa: string | null,
  cesionEstado: string | null,
) {
  await ctx.transaccion(async (tx) => {
    await tx.dteEnvio.update({
      where: { id: envioId },
      data: { intentos, estado: "aceptado", glosa, proximaConsultaEn: null },
    });
    // Si una NC o ND lo anuló antes de que el SII respondiera, la aceptación no deshace la anulación (CAR-270).
    await tx.documentoEmitido.update({ where: { id: docId }, data: { cesionEstado: cesionEstado ?? "no_cedido" } });
    await tx.documentoEmitido.updateMany({ where: { id: docId, estadoDte: "enviado" }, data: { estadoDte: "aceptado" } });
  });
}

export const trabajoConsultarDteSii = defineTrabajo({
  tipo: "finanzas.dte.consultar_sii",
  descripcion:
    "Consulta el estado de un envío al SII con backoff (15 min × 2 h, luego diario hasta 7 días) y actualiza el documento.",
  payload: payloadConsulta,
  async handler(ctx, input) {
    const envio = await ctx.db.dteEnvio.findFirst({ where: { id: input.envioId } });
    if (!envio || envio.estado !== "pendiente") return { omitido: true };
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: envio.documentoId } });
    if (!doc) return { omitido: true };
    const intentos = envio.intentos + 1;
    const ambiente = await ambienteDe(ctx);
    const adaptador = await adaptadorSiiDe(ctx);
    const consulta = await adaptador.consultar(envio.trackId, ambiente);
    if (
      (consulta.estado === "aceptado" || consulta.estado === "reparo") &&
      puedeTransicionDte("enviado", "aceptado")
    ) {
      await marcarAceptadoSii(
        ctx,
        envio.id,
        doc.id,
        intentos,
        consulta.glosa ?? null,
        doc.cesionEstado,
      );
      return { aceptado: true, intentos, reparo: consulta.estado === "reparo" };
    }
    if (consulta.estado === "rechazado") {
      await ctx.transaccion(async (tx) => {
        await tx.dteEnvio.update({
          where: { id: envio.id },
          data: { intentos, estado: "rechazado", glosa: consulta.glosa ?? null, proximaConsultaEn: null },
        });
        await tx.documentoEmitido.update({ where: { id: doc.id }, data: { estadoDte: "rechazado" } });
      });
      return { rechazado: true, intentos };
    }
    const proxima = proximaConsultaDteSii(envio.createdAt, intentos);
    if (!proxima) {
      await ctx.db.dteEnvio.update({
        where: { id: envio.id },
        data: {
          intentos,
          estado: "sin_respuesta",
          glosa: "Agotado el plazo de consulta al SII.",
          proximaConsultaEn: null,
        },
      });
      return { sinRespuesta: true, intentos };
    }
    await ctx.db.dteEnvio.update({
      where: { id: envio.id },
      data: { intentos, proximaConsultaEn: proxima, glosa: consulta.glosa ?? null },
    });
    await encolarConsultaSiPendiente(ctx, envio.id, proxima);
    return { pendiente: true, intentos };
  },
});

export async function encolarConsultaSiPendiente(ctx: Contexto, envioId: string, cuando: Date) {
  await ctx.transaccion((tx) =>
    ctx.trabajos.encolar(tx, {
      tipo: "finanzas.dte.consultar_sii",
      payload: { envioId },
      programadoPara: cuando,
      claveUnica: `finanzas.dte.consultar_sii:${envioId}:${cuando.toISOString()}`,
      maxIntentos: 1,
    }),
  );
}

export const trabajoBarrerEnviosDte = defineTrabajo({
  tipo: "finanzas.dte.barrer_envios_pendientes",
  descripcion: "Encola consultas SII para envíos pendientes cuya próxima consulta ya venció.",
  periodicidad: "horaria",
  payload: z.object({ hora: z.string() }),
  async handler(ctx, { hora: _hora }) {
    const ahora = new Date();
    const pendientes = await ctx.db.dteEnvio.findMany({
      where: {
        estado: "pendiente",
        OR: [{ proximaConsultaEn: null }, { proximaConsultaEn: { lte: ahora } }],
      },
      take: 20,
    });
    let encolados = 0;
    for (const e of pendientes) {
      const ok = await ctx.transaccion((tx) =>
        ctx.trabajos.encolar(tx, {
          tipo: "finanzas.dte.consultar_sii",
          payload: { envioId: e.id },
          claveUnica: `finanzas.dte.consultar_sii:${e.id}:sweep`,
        }),
      );
      if (ok) encolados += 1;
    }
    return { encolados };
  },
});

export const trabajosDte = [trabajoConsultarDteSii, trabajoBarrerEnviosDte];
