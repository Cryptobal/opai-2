import type { Prisma } from "@opai/db";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { desdeAncla } from "./explorar-filtros";

const ORDEN = [
  { venceEn: { sort: "asc" as const, nulls: "last" as const } },
  { createdAt: "desc" as const },
  { id: "asc" as const },
];

/** Página de documentos ordenados por vencimiento (misma keyset que el explorador en modo «vence»). */
export async function paginaDocumentosVence(
  ctx: Contexto,
  where: Prisma.DocumentoWhereInput,
  limite: number,
  cursor?: string,
) {
  const ancla = cursor
    ? await ctx.db.documento.findFirst({ where: { AND: [where, { id: cursor }] } })
    : null;
  if (cursor && !ancla) throw noEncontrado("La página pedida");
  const filas = await ctx.db.documento.findMany({
    where: ancla ? { AND: [where, desdeAncla("vence", ancla)] } : where,
    orderBy: ORDEN,
    take: limite + 1,
  });
  const visibles = filas.slice(0, limite);
  return {
    filas: visibles,
    siguiente: filas.length > limite ? (visibles.at(-1)?.id ?? null) : null,
  };
}