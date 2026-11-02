import { z } from "zod";

import { puedeTransicionDte } from "@opai/domain";

import { defineTrabajo } from "../trabajos/registro";
import { adaptadorSiiDe } from "./adaptador-sii";
import { ambienteDe } from "./ventas-comun";
import type { Contexto } from "../types";

const payloadConsulta = z.object({ envioId: z.uuid() });

export const trabajoConsultarDteSii = defineTrabajo({
  tipo: "finanzas.dte.consultar_sii",
  descripcion:
    "Consulta el estado de un envío al SII (hasta 7 intentos, paridad 1.0) y actualiza el documento si fue aceptado o rechazado.",
  payload: payloadConsulta,
  async handler(ctx, input) {
    const envio = await ctx.db.dteEnvio.findFirst({ where: { id: input.envioId } });
    if (!envio || envio.estado !== "pendiente") return { omitido: true };
    if (envio.intentos >= envio.maxIntentos) {
      await ctx.db.dteEnvio.update({
        where: { id: envio.id },
        data: { estado: "rechazado", glosa: "Agotados los intentos de consulta." },
      });
      return { agotado: true };
    }
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: envio.documentoId } });
    if (!doc) return { omitido: true };
    const ambiente = await ambienteDe(ctx);
    const adaptador = await adaptadorSiiDe(ctx);
    const consulta = await adaptador.consultar(envio.trackId, ambiente);
    const intentos = envio.intentos + 1;
    if (consulta.estado === "aceptado" && puedeTransicionDte("enviado", "aceptado")) {
      await ctx.transaccion(async (tx) => {
        await tx.dteEnvio.update({
          where: { id: envio.id },
          data: { intentos, estado: "aceptado", glosa: consulta.glosa ?? null, proximaConsultaEn: null },
        });
        await tx.documentoEmitido.update({
          where: { id: doc.id },
          data: { estadoDte: "aceptado", cesionEstado: doc.cesionEstado ?? "no_cedido" },
        });
      });
      return { aceptado: true, intentos };
    }
    if (consulta.estado === "rechazado") {
      await ctx.transaccion(async (tx) => {
        await tx.dteEnvio.update({
          where: { id: envio.id },
          data: { intentos, estado: "rechazado", glosa: consulta.glosa ?? null },
        });
        await tx.documentoEmitido.update({ where: { id: doc.id }, data: { estadoDte: "rechazado" } });
      });
      return { rechazado: true, intentos };
    }
    const proxima = new Date(Date.now() + 15 * 60_000);
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
