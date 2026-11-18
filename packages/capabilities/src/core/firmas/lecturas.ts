import { z } from "zod";

import { ESTADOS_SOLICITUD_FIRMA } from "@opai/domain";

import type { Prisma } from "@opai/db";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { documentosEnAlcance } from "../documentos/alcance-doc";
import { inputPaginaDocumentos } from "../documentos/paginacion";
import { filtroDocumentoSensible } from "../documentos/sensibles";
import { uuidSchema } from "../esquemas";
import { claseSchema } from "./comun";
import { PERMISO_FIRMAS_READ } from "./comun-flujo";
import { solicitudVistaSchema, vistaSolicitud } from "./vistas";

/**
 * De un conjunto de documentos, los que el actor puede ver: respeta el bloqueo de documentos
 * sensibles (anexos de sueldo, cumplimiento) y el alcance por instalación del supervisor (ADR-022).
 * Una solicitud de firma no se revela si su documento no es visible para el actor.
 */
async function idsDocumentosVisiblesEnTenant(
  ctx: Parameters<typeof documentosEnAlcance>[0],
): Promise<string[]> {
  const permitidos = await documentosEnAlcance(ctx);
  const docs = await ctx.db.documento.findMany({
    where: {
      AND: [
        filtroDocumentoSensible(ctx),
        ...(permitidos ? [{ id: { in: [...permitidos] } }] : []),
      ],
    },
    select: { id: true },
  });
  return docs.map((d) => d.id);
}

async function documentosVisibles(
  ctx: Parameters<typeof documentosEnAlcance>[0],
  ids: readonly string[],
): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const visibles = new Set(await idsDocumentosVisiblesEnTenant(ctx));
  return new Set(ids.filter((i) => visibles.has(i)));
}

export const firmasEstado = defineCapability({
  id: "core.firmas.estado",
  descripcion:
    "Estado de una solicitud de firma: documento, nivel, plazo, quién firmó y quién falta, con el RUN de cada firmante enmascarado (firma.md §5, §7).",
  permiso: PERMISO_FIRMAS_READ,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema }),
  output: solicitudVistaSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.id],
  async handler(ctx, input) {
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, id: input.id },
      include: { firmantes: true },
    });
    if (!s) throw noEncontrado("La solicitud de firma");
    const visibles = await documentosVisibles(ctx, [s.documentoId]);
    if (!visibles.has(s.documentoId)) throw noEncontrado("La solicitud de firma");
    return vistaSolicitud(s);
  },
});

export const firmasList = defineCapability({
  id: "core.firmas.list",
  descripcion:
    "Lista las solicitudes de firma del tenant por estado, clase o documento (por firmar, enviadas, completadas, vencidas), dentro del alcance del usuario (firma.md §5).",
  permiso: PERMISO_FIRMAS_READ,
  portales: ["erp", "supervisor"],
  input: z.object({
    estado: z.enum(ESTADOS_SOLICITUD_FIRMA).optional(),
    clase: claseSchema.optional(),
    documentoId: uuidSchema.optional(),
    ...inputPaginaDocumentos,
  }),
  output: z.object({
    items: z.array(solicitudVistaSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (r) => r.items.map((s) => s.id),
  async handler(ctx, input) {
    const documentosVisiblesIds = await idsDocumentosVisiblesEnTenant(ctx);
    if (!documentosVisiblesIds.length) return { items: [], siguiente: null };
    if (input.documentoId && !documentosVisiblesIds.includes(input.documentoId))
      return { items: [], siguiente: null };
    const base: Prisma.SolicitudFirmaWhereInput = {
      tenantId: ctx.tenantId,
      ...(input.documentoId
        ? { documentoId: input.documentoId }
        : { documentoId: { in: documentosVisiblesIds } }),
      ...(input.estado ? { estado: input.estado } : {}),
      ...(input.clase ? { clase: input.clase } : {}),
    };
    const ancla = input.cursor
      ? await ctx.db.solicitudFirma.findFirst({ where: { AND: [base, { id: input.cursor }] } })
      : null;
    if (input.cursor && !ancla) throw noEncontrado("La página pedida");
    const orden = [{ createdAt: "desc" as const }, { id: "desc" as const }];
    const trasAncla: Prisma.SolicitudFirmaWhereInput | undefined = ancla
      ? {
          OR: [
            { createdAt: { lt: ancla.createdAt } },
            { createdAt: ancla.createdAt, id: { lt: ancla.id } },
          ],
        }
      : undefined;
    const filas = await ctx.db.solicitudFirma.findMany({
      where: trasAncla ? { AND: [base, trasAncla] } : base,
      include: { firmantes: true },
      orderBy: orden,
      take: input.limite + 1,
    });
    const pagina = filas.slice(0, input.limite);
    const siguiente = filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null;
    return { items: pagina.map(vistaSolicitud), siguiente };
  },
});
