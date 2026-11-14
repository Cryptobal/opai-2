import { z } from "zod";

import { defineConsumidor, defineTrabajo, type Contexto } from "@opai/capabilities";

import type { EstadoAlerta, Severidad } from "../domain";
import { siguientePaso } from "../domain/cadena";
import { cadenaDe, contactarPaso, TRABAJO_REVISAR } from "./motor";
import { registrarHecho } from "./util";

/** Al abrirse una alerta se contacta el paso 1 de su cadena (R7). Idempotente: solo si sigue nueva. */
export const consumidorAlertaAbierta = defineConsumidor({
  id: "central.alerta.iniciar_cadena",
  descripcion: "Inicia la cadena de escalamiento de una alerta recién abierta en la central.",
  eventos: ["central.alerta.abierta"],
  async handler(ctx, ev) {
    if (!ev.entidadId) return;
    const a = await ctx.db.centralAlerta.findFirst({ where: { id: ev.entidadId } });
    if (!a || a.estado !== "nueva" || a.pasoActual !== 0) return;
    await ctx.transaccion((tx) => contactarPaso(ctx, tx, a, 1));
  },
});

/**
 * Revisa una alerta a la hora en que vence algo (R4a, R7, R8): una pospuesta vuelve a la cola, un
 * paso sin confirmación escala al siguiente y un «me hago cargo» sin resolver retoma la cadena.
 */
async function revisar(ctx: Contexto, alertaId: string) {
  const ahora = new Date();
  await ctx.transaccion(async (tx) => {
    let a = await tx.centralAlerta.findFirst({ where: { id: alertaId } });
    if (!a) return;
    if (a.estado === "pospuesta" && a.pospuestaHasta && a.pospuestaHasta <= ahora) {
      const previo = (a.estadoPrevio ?? "nueva") as EstadoAlerta;
      a = await tx.centralAlerta.update({ where: { id: a.id }, data: { estado: previo, estadoPrevio: null, pospuestaHasta: null } });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "reactivada", estadoDesde: "pospuesta", estadoHacia: previo, sistema: true });
    }
    const total = (await cadenaDe(tx, a)).pasos.length;
    const sev = a.severidad as Severidad;
    const pasoVencido = ["en_contacto", "escalada"].includes(a.estado) && a.pasoVenceEn && a.pasoVenceEn <= ahora;
    const atencionVencida = a.estado === "en_atencion" && a.atencionVenceEn && a.atencionVenceEn <= ahora;
    if (a.estado === "nueva" && a.pasoActual === 0) return contactarPaso(ctx, tx, a, 1);
    if (!pasoVencido && !atencionVencida) return;
    const siguiente = siguientePaso(a.pasoActual, total, sev) ?? (atencionVencida ? Math.max(a.pasoActual, 1) : null);
    if (siguiente) await contactarPaso(ctx, tx, a, siguiente);
  });
}

export const trabajoRevisarAlerta = defineTrabajo({
  tipo: TRABAJO_REVISAR,
  descripcion: "Revisa una alerta de la central cuando vence su espera, su plazo de atención o su pospuesta.",
  payload: z.object({ alertaId: z.uuid() }),
  handler: (ctx, p) => revisar(ctx, p.alertaId),
});

export const trabajosCentral = [trabajoRevisarAlerta];
export const consumidoresCentral = [consumidorAlertaAbierta];
