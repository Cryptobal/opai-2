import { z } from "zod";

import { HITO_VENCIDO, hitoAlcanzado } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { dia } from "../maestros/comun";

const payload = z.object({ dia: z.string() });
const HITOS_POR_DEFECTO = [30, 14, 7, 3, 1, 0];
const LOTE = 500;
/** Páginas de candidatos por ejecución de la purga, por si las primeras están todas referenciadas. */
const PAGINAS = 5;

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
      // Los que ya recibieron el aviso final no se vuelven a revisar (si no, taparían a los nuevos).
      where: {
        estado: "disponible",
        venceEn: { not: null },
        OR: [{ hitoNotificado: null }, { hitoNotificado: { not: HITO_VENCIDO } }],
      },
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

/** Documentos de `ids` que referencia una evidencia de cumplimiento o una versión que los reemplaza. */
async function documentosReferidos(ctx: Contexto, ids: string[]): Promise<Set<string | null>> {
  const [evidencias, incidentes, versiones] = await Promise.all([
    ctx.db.solicitudArco.findMany({ where: { documentoEvidenciaId: { in: ids } } }),
    ctx.db.incidente.findMany({ where: { evidenciaDocId: { in: ids } } }),
    ctx.db.documento.findMany({ where: { reemplazaAId: { in: ids } } }),
  ]);
  return new Set([
    ...evidencias.map((s) => s.documentoEvidenciaId),
    ...incidentes.map((i) => i.evidenciaDocId),
    ...versiones.map((d) => d.reemplazaAId),
  ]);
}

/** Subidas no confirmadas en 24 horas: se borra el objeto (si llegó) y el registro (ADR-039). */
export const trabajoPurgarSubidasPendientes = defineTrabajo({
  tipo: "core.documentos.purgar_pendientes",
  descripcion: "Elimina a diario las subidas de documentos que no se confirmaron en 24 horas.",
  payload,
  periodicidad: "diaria",
  async handler(ctx) {
    const limite = new Date(Date.now() - 86_400_000);
    // Las FKs RESTRICT (CAR-46) harían fallar el lote entero, ya sin los objetos: se omiten los
    // pendientes que algo referencia y se sigue por id, para que esos no traben la purga.
    const pendientes: { id: string; storageKey: string }[] = [];
    let despuesDe: string | undefined;
    for (let pagina = 0; pagina < PAGINAS && pendientes.length < LOTE; pagina++) {
      const candidatos = await ctx.db.documento.findMany({
        where: {
          estado: "pendiente",
          createdAt: { lt: limite },
          ...(despuesDe ? { id: { gt: despuesDe } } : {}),
        },
        orderBy: { id: "asc" },
        take: LOTE,
      });
      if (candidatos.length === 0) break;
      despuesDe = candidatos[candidatos.length - 1]?.id;
      const referidos = await documentosReferidos(
        ctx,
        candidatos.map((d) => d.id),
      );
      pendientes.push(...candidatos.filter((d) => !referidos.has(d.id)));
    }
    pendientes.splice(LOTE);
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
