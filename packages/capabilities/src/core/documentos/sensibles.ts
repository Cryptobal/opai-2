import { ENTIDADES_DOC_CUMPLIMIENTO, PERMISOS_CORE } from "@opai/domain";
import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";

const TIPOS_CUMPLIMIENTO = [...ENTIDADES_DOC_CUMPLIMIENTO];

/** Si el actor puede ver documentos de cumplimiento (Ley 21.719). Supervisor y viewer no. */
const puedeVerCumplimiento = (ctx: Contexto): boolean =>
  ctx.autorizar(PERMISOS_CORE.cumplimientoRead);

/**
 * Documentos de anexos de contrato (sueldos): solo con `anexos.read` o `estructuras.read_sensible`.
 * La relación con el anexo identifica también documentos generados antes de este arreglo.
 */
export const filtroDocumentoAnexo = (ctx: Contexto): Prisma.DocumentoWhereInput[] =>
  ctx.autorizar(PERMISOS_CORE.anexosRead) || ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)
    ? []
    : [{ anexos: { none: {} } }];

/** Filtra en la misma consulta que obtiene los metadatos, también para versiones/vencimientos. */
export const filtroDocumentoSensible = (ctx: Contexto): Prisma.DocumentoWhereInput => ({
  AND: [
    ...(puedeVerCumplimiento(ctx)
      ? []
      : [{ vinculos: { none: { entidadTipo: { in: TIPOS_CUMPLIMIENTO } } } }]),
    ...filtroDocumentoAnexo(ctx),
  ],
});
