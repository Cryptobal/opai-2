import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { Prisma } from "@opai/db";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { hoy } from "../maestros/comun";
import { documentosEnAlcance } from "./alcance-doc";
import { tiposPorId } from "./consulta";
import { firmaDe, propietariosDe } from "./explorar-entidades";
import { dondeTexto, dondeVigencia, ORDENES, ordenDe } from "./explorar-filtros";
import { filtroDocumentoSensible } from "./sensibles";
import { documentoSchema, ENTIDADES, vistaDocumento } from "./vista";

const filaSchema = documentoSchema.extend({
  entidad: z
    .object({ tipo: z.string(), id: z.string(), nombre: z.string().nullable() })
    .nullable()
    .describe(
      "Propietario del documento; el nombre solo si el actor puede leer ese tipo de entidad.",
    ),
  firma: z
    .enum(["pendiente", "firmado"])
    .nullable()
    .describe("Estado de firma; null si no hay solicitudes o el actor no puede ver firmas."),
});

export const documentosExplorar = defineCapability({
  auditarLectura: (s) => [
    ...s.items.map((d) => d.id),
    // Nombres de personas revelados por la página: mismo criterio que `core.documentos.matriz`.
    ...s.items.flatMap((d) =>
      d.entidad?.tipo === "persona" && d.entidad.nombre ? [d.entidad.id] : [],
    ),
  ],
  id: "core.documentos.explorar",
  descripcion:
    "Explorador de documentos del tenant: página por cursor con búsqueda por texto (nombre, título y etiquetas), filtros por tipo de entidad propietaria, tipo de documento y vigencia, orden, y para cada documento su entidad propietaria y su estado de firma. Respeta el alcance del supervisor y excluye los documentos sensibles.",
  permiso: PERMISOS_CORE.documentosRead,
  portales: ["erp", "supervisor"],
  input: z.object({
    q: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional()
      .describe("Texto a buscar en nombre, título y etiquetas."),
    entidadTipo: z.enum(ENTIDADES).optional().describe("Tipo de la entidad propietaria."),
    tipoId: uuidSchema.optional(),
    vigencia: z.enum(["vigente", "por_vencer", "vencido", "sin_fecha"]).optional(),
    orden: z.enum(ORDENES).default("recientes"),
    incluirArchivados: z.boolean().default(false),
    cursor: uuidSchema.optional().describe("`siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    items: z.array(filaSchema),
    siguiente: z.string().nullable(),
    total: z.number().describe("Documentos que cumplen los filtros (no solo los de la página)."),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // Alcance (ADR-022) y sensibles (cumplimiento, anexos) van en la misma consulta que lee los metadatos.
    const permitidos = await documentosEnAlcance(ctx);
    const filtros: Prisma.DocumentoWhereInput[] = [
      filtroDocumentoSensible(ctx),
      { estado: { in: input.incluirArchivados ? ["disponible", "archivado"] : ["disponible"] } },
      ...(permitidos ? [{ id: { in: [...permitidos] } }] : []),
      ...(input.tipoId ? [{ tipoId: input.tipoId }] : []),
      ...(input.entidadTipo
        ? [{ vinculos: { some: { rol: "propietario", entidadTipo: input.entidadTipo } } }]
        : []),
      ...(input.q ? [dondeTexto(input.q)] : []),
      ...(input.vigencia ? [await dondeVigencia(ctx, input.vigencia, hoy())] : []),
    ];
    const where: Prisma.DocumentoWhereInput = { AND: filtros };
    // El cursor debe ser un documento que esta misma consulta devolvería: ancla fuera de alcance = no existe.
    if (
      input.cursor &&
      !(await ctx.db.documento.findFirst({
        where: { AND: [where, { id: input.cursor }] },
        select: { id: true },
      }))
    )
      throw noEncontrado("La página pedida");
    const [filas, total] = await Promise.all([
      ctx.db.documento.findMany({
        where,
        orderBy: ordenDe(input.orden),
        take: input.limite + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      }),
      ctx.db.documento.count({ where }),
    ]);
    const docs = filas.slice(0, input.limite);
    const ids = docs.map((d) => d.id);
    const [tipos, propietarios, firmas] = await Promise.all([
      tiposPorId(
        ctx,
        docs.map((d) => d.tipoId),
      ),
      propietariosDe(ctx, ids),
      firmaDe(ctx, ids),
    ]);
    return {
      items: docs.map((d) => ({
        ...vistaDocumento(d, d.tipoId ? tipos.get(d.tipoId) : null, hoy()),
        entidad: propietarios.porDocumento.get(d.id) ?? null,
        firma: firmas.get(d.id) ?? null,
      })),
      siguiente: filas.length > input.limite ? (docs.at(-1)?.id ?? null) : null,
      total,
    };
  },
});
