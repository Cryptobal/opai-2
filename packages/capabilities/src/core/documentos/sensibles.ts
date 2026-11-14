import { ENTIDADES_DOC_CUMPLIMIENTO, PERMISOS_CORE } from "@opai/domain";
import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";

const TIPOS_CUMPLIMIENTO = [...ENTIDADES_DOC_CUMPLIMIENTO];

/** Si el actor puede ver documentos de cumplimiento (Ley 21.719). Supervisor y viewer no. */
export const puedeVerCumplimiento = (ctx: Contexto): boolean =>
  ctx.autorizar(PERMISOS_CORE.cumplimientoRead);

/** Versiones anteriores que se revisan para reconocer un anexo (Prisma no filtra recursivo). */
export const NIVELES_VERSION_ANEXO = 3;

/**
 * Ni el documento ni sus versiones anteriores, hasta `niveles`, son de un anexo. CAR-512: la copia
 * firmada y las versiones nuevas no heredan la relación con el anexo, que apunta al original.
 * Trae un `OR` en el primer nivel: se usa dentro de `AND` o `NOT`, nunca esparcido en otro where.
 */
export const sinAnexo = (niveles: number): Prisma.DocumentoWhereInput => ({
  anexos: { none: {} },
  ...(niveles > 0 && {
    OR: [{ reemplazaAId: null }, { reemplazaA: { is: sinAnexo(niveles - 1) } }],
  }),
});

/**
 * Documentos de anexos de contrato (sueldos): solo con `anexos.read` o `estructuras.read_sensible`.
 * La relación con el anexo identifica también documentos generados antes de este arreglo, y la cadena
 * de versiones cubre la copia firmada y hasta tres versiones posteriores.
 */
export const filtroDocumentoAnexo = (ctx: Contexto): Prisma.DocumentoWhereInput[] =>
  ctx.autorizar(PERMISOS_CORE.anexosRead) || ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)
    ? []
    : [sinAnexo(NIVELES_VERSION_ANEXO)];

/** Filtra en la misma consulta que obtiene los metadatos, también para versiones/vencimientos. */
export const filtroDocumentoSensible = (ctx: Contexto): Prisma.DocumentoWhereInput => ({
  AND: [
    ...(puedeVerCumplimiento(ctx)
      ? []
      : [{ vinculos: { none: { entidadTipo: { in: TIPOS_CUMPLIMIENTO } } } }]),
    ...filtroDocumentoAnexo(ctx),
  ],
});

/** Ids (de entre los dados) de documentos vinculados a una entidad de cumplimiento. Una consulta. */
export async function docsDeCumplimiento(
  ctx: Contexto,
  documentoIds: readonly string[],
): Promise<Set<string>> {
  if (!documentoIds.length) return new Set();
  const vinculos = await ctx.db.documentoVinculo.findMany({
    where: { documentoId: { in: [...documentoIds] }, entidadTipo: { in: TIPOS_CUMPLIMIENTO } },
    select: { documentoId: true },
  });
  return new Set(vinculos.map((v) => v.documentoId));
}

/** True si el documento está vinculado a una entidad de cumplimiento (requiere `cumplimiento.read`). */
export async function esDocCumplimiento(ctx: Contexto, documentoId: string): Promise<boolean> {
  const v = await ctx.db.documentoVinculo.findFirst({
    where: { documentoId, entidadTipo: { in: TIPOS_CUMPLIMIENTO } },
    select: { id: true },
  });
  return v !== null;
}
