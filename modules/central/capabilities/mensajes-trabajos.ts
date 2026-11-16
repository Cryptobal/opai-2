import { z } from "zod";

import { defineTrabajo } from "@opai/capabilities";

import { SEVERIDAD_CONSULTA_VENCIDA, SEVERIDAD_SIN_ACUSE } from "../domain/mensajes";
import { abrirAlertaSistema, TRABAJO_ACUSE, TRABAJO_CONSULTA } from "./mensajes-util";

/**
 * Consulta sin respuesta al vencer su plazo (R16): entra a la cola como alerta. Idempotente: si la
 * central ya respondió, la cerró o ya abrió la alerta, no hace nada.
 */
export const trabajoRevisarConsulta = defineTrabajo({
  tipo: TRABAJO_CONSULTA,
  descripcion: "Abre una alerta en la central cuando una consulta de terreno no tuvo respuesta en su plazo.",
  payload: z.object({ hiloId: z.uuid() }),
  async handler(ctx, p) {
    await ctx.transaccion(async (tx) => {
      // Se bloquea la fila: una respuesta simultánea de la central gana o espera (claveUnica evita dos corridas).
      await tx.$queryRaw`SELECT id FROM central.hilos WHERE id = ${p.hiloId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const h = await tx.centralHilo.findFirst({ where: { id: p.hiloId } });
      if (!h || h.alertaId || !["enviado", "recibido"].includes(h.estado)) return;
      if (!h.consultaVenceEn || h.consultaVenceEn > new Date()) return;
      const alertaId = await abrirAlertaSistema(ctx, tx, {
        instalacionId: h.instalacionId,
        personaId: h.personaId,
        titulo: "Consulta de terreno sin respuesta",
        descripcion: "",
        severidad: SEVERIDAD_CONSULTA_VENCIDA,
        origen: "central.consulta_vencida",
      });
      await tx.centralHilo.update({ where: { id: h.id }, data: { alertaId } });
    });
  },
});

/**
 * Aviso sin acuse al vencer el plazo (R17, CA7): una alerta por instalación con quienes no acusaron.
 * Idempotente: cada destinatario guarda la alerta que lo cubre y no se abre otra.
 */
export const trabajoRevisarAcuse = defineTrabajo({
  tipo: TRABAJO_ACUSE,
  descripcion: "Abre una alerta en la central por los destinatarios que no acusaron un aviso dentro de su plazo.",
  payload: z.object({ avisoId: z.uuid() }),
  async handler(ctx, p) {
    await ctx.transaccion(async (tx) => {
      const ahora = new Date();
      const pendientes = await tx.centralAvisoDestinatario.findMany({
        where: { avisoId: p.avisoId, alertaId: null, venceEn: { lte: ahora }, instalacionId: { not: null } },
      });
      if (pendientes.length === 0) return;
      const acusaron = new Set(
        (await tx.centralAcuse.findMany({ where: { avisoId: p.avisoId }, select: { personaId: true } })).map((a) => a.personaId),
      );
      const faltan = pendientes.filter((d) => !acusaron.has(d.personaId));
      const porInstalacion = new Map<string, typeof faltan>();
      for (const d of faltan) if (d.instalacionId) porInstalacion.set(d.instalacionId, [...(porInstalacion.get(d.instalacionId) ?? []), d]);
      for (const [instalacionId, grupo] of porInstalacion) {
        const alertaId = await abrirAlertaSistema(ctx, tx, {
          instalacionId,
          personaId: grupo.length === 1 ? (grupo[0]?.personaId ?? null) : null,
          titulo: grupo.length === 1 ? "Aviso sin acuse" : `Aviso sin acuse de ${grupo.length} personas`,
          descripcion: "",
          severidad: SEVERIDAD_SIN_ACUSE,
          origen: "central.aviso_sin_acuse",
        });
        await tx.centralAvisoDestinatario.updateMany({ where: { id: { in: grupo.map((d) => d.id) }, alertaId: null }, data: { alertaId } });
      }
    });
  },
});
