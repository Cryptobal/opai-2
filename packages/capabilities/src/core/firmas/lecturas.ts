import { z } from "zod";

import { ESTADOS_SOLICITUD_FIRMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { documentosEnAlcance } from "../documentos/alcance-doc";
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
async function documentosVisibles(
  ctx: Parameters<typeof documentosEnAlcance>[0],
  ids: readonly string[],
): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const permitidos = await documentosEnAlcance(ctx);
  const docs = await ctx.db.documento.findMany({
    where: {
      ...filtroDocumentoSensible(ctx),
      id: { in: permitidos ? [...ids].filter((i) => permitidos.includes(i)) : [...ids] },
    },
    select: { id: true },
  });
  return new Set(docs.map((d) => d.id));
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
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ solicitudes: z.array(solicitudVistaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (r) => r.solicitudes.map((s) => s.id),
  async handler(ctx, input) {
    const filas = await ctx.db.solicitudFirma.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(input.estado ? { estado: input.estado } : {}),
        ...(input.clase ? { clase: input.clase } : {}),
        ...(input.documentoId ? { documentoId: input.documentoId } : {}),
      },
      include: { firmantes: true },
      orderBy: { createdAt: "desc" },
      take: input.limite,
    });
    const visibles = await documentosVisibles(
      ctx,
      filas.map((f) => f.documentoId),
    );
    return { solicitudes: filas.filter((f) => visibles.has(f.documentoId)).map(vistaSolicitud) };
  },
});
