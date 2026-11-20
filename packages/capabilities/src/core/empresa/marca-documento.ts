import { z } from "zod";

import type { Contexto } from "../../types";

const TIPOGRAFIAS_DOCUMENTO = ["inter", "helvetica", "times"] as const;
export type TipografiaDocumento = (typeof TIPOGRAFIAS_DOCUMENTO)[number];

export const tipografiaDocumento = z.enum(TIPOGRAFIAS_DOCUMENTO);

export type MarcaDocumentoCampos = {
  documentoTipografia: TipografiaDocumento;
  documentoPiePagina: string | null;
  documentoCondicionesDefault: string | null;
};

export function marcaDocumentoDe(perfil: {
  documentoTipografia?: string | null;
  documentoPiePagina?: string | null;
  documentoCondicionesDefault?: string | null;
} | null): MarcaDocumentoCampos {
  const tipografia = (perfil?.documentoTipografia ?? "inter") as TipografiaDocumento;
  return {
    documentoTipografia: TIPOGRAFIAS_DOCUMENTO.includes(tipografia) ? tipografia : "inter",
    documentoPiePagina: perfil?.documentoPiePagina ?? null,
    documentoCondicionesDefault: perfil?.documentoCondicionesDefault ?? null,
  };
}

export function marcaDocumentoInputSchema() {
  return {
    documentoTipografia: tipografiaDocumento.optional(),
    documentoPiePagina: z.string().trim().max(2000).nullable().optional(),
    documentoCondicionesDefault: z.string().trim().max(8000).nullable().optional(),
  };
}

/** Versión CPQ congelada en PDF: lee revisiones históricas si el tenant aún las tiene. */
export async function marcaDocumentoEnVersion(
  ctx: Contexto,
  version: number,
): Promise<(MarcaDocumentoCampos & { version: number }) | null> {
  const actual = await ctx.db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId } });
  const perfil = marcaDocumentoDe(await ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }));
  if (!actual) return { ...perfil, version: 0 };
  if (actual.version === version) return { ...perfil, version: actual.version };
  const rev = await ctx.db.cpqMarcaDocumentoRevision.findFirst({
    where: { marcaDocumentoId: actual.id, version },
  });
  if (!rev) return null;
  return {
    documentoTipografia: rev.tipografia as TipografiaDocumento,
    documentoPiePagina: rev.piePagina,
    documentoCondicionesDefault: rev.condicionesDefault,
    version: rev.version,
  };
}

type DocInput = Partial<{
  documentoTipografia: TipografiaDocumento;
  documentoPiePagina: string | null;
  documentoCondicionesDefault: string | null;
}>;

export function fusionarMarcaDocumento(
  perfil: Parameters<typeof marcaDocumentoDe>[0],
  data: DocInput,
): MarcaDocumentoCampos {
  const actual = marcaDocumentoDe(perfil);
  return {
    documentoTipografia: data.documentoTipografia ?? actual.documentoTipografia,
    documentoPiePagina:
      data.documentoPiePagina !== undefined ? data.documentoPiePagina : actual.documentoPiePagina,
    documentoCondicionesDefault:
      data.documentoCondicionesDefault !== undefined
        ? data.documentoCondicionesDefault
        : actual.documentoCondicionesDefault,
  };
}

export async function persistirMarcaDocumento(ctx: Contexto, merged: MarcaDocumentoCampos) {
  const db = ctx.db;
  let cpq = await db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId } });
  if (!cpq) {
    cpq = await db.cpqMarcaDocumento.create({
      data: {
        tenantId: ctx.tenantId,
        version: 1,
        tipografia: merged.documentoTipografia,
        piePagina: merged.documentoPiePagina,
        condicionesDefault: merged.documentoCondicionesDefault,
      },
    });
  } else {
    await db.cpqMarcaDocumentoRevision.create({
      data: {
        tenantId: ctx.tenantId,
        marcaDocumentoId: cpq.id,
        version: cpq.version,
        tipografia: cpq.tipografia,
        piePagina: cpq.piePagina,
        condicionesDefault: cpq.condicionesDefault,
      },
    });
    cpq = await db.cpqMarcaDocumento.update({
      where: { id: cpq.id },
      data: {
        tipografia: merged.documentoTipografia,
        piePagina: merged.documentoPiePagina,
        condicionesDefault: merged.documentoCondicionesDefault,
        version: { increment: 1 },
      },
    });
  }
  await db.perfilEmpresa.upsert({
    where: { tenantId: ctx.tenantId },
    create: { tenantId: ctx.tenantId, ...merged },
    update: merged,
  });
  return { ...merged, version: cpq.version };
}

/** Escribe en perfil y mantiene la tabla CPQ solo para versiones de PDF ya enviados. */
export async function actualizarMarcaDocumento(ctx: Contexto, data: DocInput, escribir: boolean) {
  const perfil = await ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } });
  const merged = fusionarMarcaDocumento(perfil, data);
  if (!escribir) return merged;
  return ctx.transaccion((tx) => persistirMarcaDocumento({ ...ctx, db: tx }, merged));
}