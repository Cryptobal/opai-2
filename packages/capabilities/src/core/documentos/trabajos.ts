import { z } from "zod";

import { HITO_VENCIDO, hitoAlcanzado } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import { dia } from "../maestros/comun";

const payload = z.object({ dia: z.string() });
const HITOS_POR_DEFECTO = [30, 14, 7, 3, 1, 0];
const LOTE = 500;

/**
 * Escalera de avisos de vencimiento (ADR-019): una vez por hito y por documento, emite
 * core.documento.por_vencer o core.documento.vencido; Comunicaciones decide a quién avisar.
 */
export const trabajoVencimientosDocumentos = defineTrabajo({
  tipo: "core.documentos.vencimientos",
  descripcion:
    "Revisa a diario los vencimientos de documentos y emite un evento por hito alcanzado.",
  payload,
  periodicidad: "diaria",
  async handler(ctx, { dia: hoy }) {
    const docs = await ctx.db.documento.findMany({
      where: { estado: "disponible", venceEn: { not: null } },
      orderBy: { venceEn: "asc" },
      take: LOTE,
    });
    const tipos = new Map((await ctx.db.documentoTipo.findMany({})).map((t) => [t.id, t.hitos]));
    let avisos = 0;
    for (const d of docs) {
      const hitos = (d.tipoId && tipos.get(d.tipoId)) || HITOS_POR_DEFECTO;
      const hito = hitoAlcanzado(dia(d.venceEn), hoy, hitos, d.hitoNotificado ?? null);
      if (hito === null) continue;
      await ctx.transaccion(async (tx) => {
        await tx.documento.update({ where: { id: d.id }, data: { hitoNotificado: hito } });
        await ctx.eventos.emitir(tx, {
          tipo: hito === HITO_VENCIDO ? "core.documento.vencido" : "core.documento.por_vencer",
          entidadTipo: "documento",
          entidadId: d.id,
          payload: { venceEn: dia(d.venceEn), dias: hito, tipoId: d.tipoId },
        });
      });
      avisos += 1;
    }
    return { revisados: docs.length, avisos };
  },
});

/** Subidas no confirmadas en 24 horas: se borra el objeto (si llegó) y el registro (ADR-039). */
export const trabajoPurgarSubidasPendientes = defineTrabajo({
  tipo: "core.documentos.purgar_pendientes",
  descripcion: "Elimina a diario las subidas de documentos que no se confirmaron en 24 horas.",
  payload,
  periodicidad: "diaria",
  async handler(ctx) {
    const limite = new Date(Date.now() - 86_400_000);
    const pendientes = await ctx.db.documento.findMany({
      where: { estado: "pendiente", createdAt: { lt: limite } },
      take: LOTE,
    });
    for (const d of pendientes) {
      await ctx.servicios.almacenamiento.eliminar(d.storageKey).catch(() => undefined);
    }
    const { count } = await ctx.db.documento.deleteMany({
      where: { id: { in: pendientes.map((d) => d.id) }, estado: "pendiente" },
    });
    return { eliminados: count };
  },
});

export const trabajosDocumentos = [trabajoVencimientosDocumentos, trabajoPurgarSubidasPendientes];
