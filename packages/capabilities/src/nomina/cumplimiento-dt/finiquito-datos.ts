import { aFecha, dia } from "../../core/maestros/comun";
import type { Contexto } from "../../types";

function diasCalendarioIncluidos(desde: string, hasta: string): number {
  return Math.max(
    0,
    Math.round((Date.parse(`${hasta}T00:00:00.000Z`) - Date.parse(`${desde}T00:00:00.000Z`)) / 86_400_000) + 1,
  );
}

/** Días calendario de vacaciones tomados hasta la fecha de término. */
export async function diasVacacionesTomados(ctx: Contexto, personaId: string, hasta: string): Promise<number> {
  const tope = aFecha(hasta);
  const ausencias = await ctx.db.ausencia.findMany({
    where: {
      tenantId: ctx.tenantId,
      personaId,
      tipo: "vacaciones",
      estado: { not: "anulada" },
      desde: { lte: tope },
    },
  });
  let total = 0;
  for (const a of ausencias) {
    const desde = dia(a.desde)!;
    const finRaw = dia(a.hasta)!;
    const fin = finRaw > hasta ? hasta : finRaw;
    if (fin < desde) continue;
    total += diasCalendarioIncluidos(desde, fin);
  }
  return total;
}

export type ComprobanteMiDt = { documentoId: string; nombre: string; registradoEn: string };
export type CartaArt162 = {
  documentoId: string;
  titulo: string;
  estadoFirma: string;
  solicitudId: string;
};

function pareceCartaTermino(doc: { titulo: string | null; nombre: string; etiquetas: string[] }): boolean {
  const t = `${doc.titulo ?? ""} ${doc.nombre}`.toLowerCase();
  if (doc.etiquetas.some((e) => e.toLowerCase().includes("art_162") || e.toLowerCase().includes("termino"))) return true;
  return t.includes("término") || t.includes("termino") || t.includes("art. 162") || t.includes("art 162");
}

/** Comprobante Mi DT del finiquito y carta al trabajador vinculada a la persona, si existen. */
export async function documentosFiniquito(
  ctx: Contexto,
  personaId: string,
  reg: { documentoId: string | null; registradoEn: Date } | null,
): Promise<{ comprobanteMiDt: ComprobanteMiDt | null; cartaArt162: CartaArt162 | null }> {
  let comprobanteMiDt: ComprobanteMiDt | null = null;
  if (reg?.documentoId) {
    const doc = await ctx.db.documento.findFirst({
      where: { id: reg.documentoId, tenantId: ctx.tenantId },
      select: { id: true, nombre: true },
    });
    if (doc) {
      comprobanteMiDt = {
        documentoId: doc.id,
        nombre: doc.nombre,
        registradoEn: dia(reg.registradoEn)!,
      };
    }
  }

  const vinculos = await ctx.db.documentoVinculo.findMany({
    where: { tenantId: ctx.tenantId, entidadTipo: "persona", entidadId: personaId },
    select: { documentoId: true },
    take: 40,
  });
  const docIds = vinculos.map((v) => v.documentoId);
  if (!docIds.length) return { comprobanteMiDt, cartaArt162: null };

  const solicitud = await ctx.db.solicitudFirma.findFirst({
    where: { tenantId: ctx.tenantId, clase: "carta_trabajador", documentoId: { in: docIds } },
    orderBy: { createdAt: "desc" },
  });
  if (!solicitud) return { comprobanteMiDt, cartaArt162: null };

  const doc = await ctx.db.documento.findFirst({
    where: { id: solicitud.documentoId, tenantId: ctx.tenantId },
    select: { id: true, titulo: true, nombre: true, etiquetas: true },
  });
  if (!doc || !pareceCartaTermino(doc)) return { comprobanteMiDt, cartaArt162: null };

  return {
    comprobanteMiDt,
    cartaArt162: {
      documentoId: doc.id,
      titulo: doc.titulo ?? doc.nombre,
      estadoFirma: solicitud.estado,
      solicitudId: solicitud.id,
    },
  };
}