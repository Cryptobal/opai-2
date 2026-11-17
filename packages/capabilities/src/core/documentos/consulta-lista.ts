import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { Prisma } from "@opai/db";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { entidadEnAlcance } from "../maestros/alcance";
import { hoy } from "../maestros/comun";
import { documentosEnAlcance } from "./alcance-doc";
import { tiposPorId } from "./consulta";
import { CAPA_DE } from "./entidad";
import { dondeVigencia } from "./explorar-filtros";
import { paginaDocumentosVence } from "./pagina-vence";
import { filtroDocumentoSensible } from "./sensibles";
import { documentoSchema, entidadSchema, vistaDocumento } from "./vista";

export const documentosList = defineCapability({
  auditarLectura: (s) => s.items.map((d) => d.id),
  id: "core.documentos.list",
  descripcion:
    "Documentos vigentes (última versión) de una entidad —empresa, cuenta, instalación, persona o puesto— o de todo el tenant, con estado de vigencia; por entidad incluye los tipos obligatorios que faltan.",
  permiso: PERMISOS_CORE.documentosRead,
  portales: ["erp", "supervisor"],
  input: z.object({
    entidad: entidadSchema.optional(),
    tipoId: uuidSchema.optional(),
    vigencia: z.enum(["vigente", "por_vencer", "vencido", "sin_fecha"]).optional(),
    incluirArchivados: z.boolean().default(false),
    cursor: uuidSchema.optional().describe("`siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    items: z.array(documentoSchema),
    siguiente: z.string().nullable(),
    faltantes: z.array(z.object({ tipoId: z.string(), nombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (input.entidad && !(await entidadEnAlcance(ctx, input.entidad.tipo, input.entidad.id)))
      return { items: [], siguiente: null, faltantes: [] };
    let ids: readonly string[] | null;
    if (input.entidad) {
      const vinculados = (
        await ctx.db.documentoVinculo.findMany({
          where: { entidadTipo: input.entidad.tipo, entidadId: input.entidad.id },
          select: { documentoId: true },
        })
      ).map((v) => v.documentoId);
      const permitidos = await documentosEnAlcance(ctx);
      const enAlcance = permitidos && new Set(permitidos);
      ids = enAlcance ? vinculados.filter((id) => enAlcance.has(id)) : vinculados;
    } else {
      ids = await documentosEnAlcance(ctx);
    }
    const estados = input.incluirArchivados ? ["disponible", "archivado"] : ["disponible"];
    const hoyIso = hoy();
    const filtros: Prisma.DocumentoWhereInput[] = [
      filtroDocumentoSensible(ctx),
      { estado: { in: estados } },
      ...(ids ? [{ id: { in: [...ids] } }] : []),
      ...(input.tipoId ? [{ tipoId: input.tipoId }] : []),
      ...(input.vigencia ? [await dondeVigencia(ctx, input.vigencia, hoyIso)] : []),
    ];
    const where: Prisma.DocumentoWhereInput = { AND: filtros };
    const { filas: visibles, siguiente } = await paginaDocumentosVence(
      ctx,
      where,
      input.limite,
      input.cursor,
    );
    const tipos = await tiposPorId(
      ctx,
      visibles.map((d) => d.tipoId),
    );
    const items = visibles.map((d) =>
      vistaDocumento(d, d.tipoId ? tipos.get(d.tipoId) : null, hoyIso),
    );
    let faltantes: { tipoId: string; nombre: string }[] = [];
    if (input.entidad) {
      const obligatorios = await ctx.db.documentoTipo.findMany({
        where: { capa: CAPA_DE[input.entidad.tipo], obligatorio: true, activo: true },
        orderBy: { orden: "asc" },
      });
      const presentes = await ctx.db.documento.findMany({
        where,
        select: { tipoId: true },
        distinct: ["tipoId"],
      });
      const idsTipo = new Set(presentes.map((d) => d.tipoId));
      faltantes = obligatorios
        .filter((t) => !idsTipo.has(t.id))
        .map((t) => ({ tipoId: t.id, nombre: t.nombre }));
    }
    return { items, siguiente, faltantes };
  },
});