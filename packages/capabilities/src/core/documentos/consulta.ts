import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { Prisma } from "@opai/db";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { entidadEnAlcance } from "../maestros/alcance";
import { hoy } from "../maestros/comun";
import { documentosEnAlcance } from "./alcance-doc";
import { CAPA_DE } from "./entidad";
import { dondeVigencia, desdeAncla } from "./explorar-filtros";
import { filtroDocumentoSensible } from "./sensibles";
import { documentoSchema, entidadSchema, vistaDocumento } from "./vista";

/** Tipos por id (nombre y días de alerta) para una página de documentos. */
export async function tiposPorId(ctx: Contexto, ids: (string | null)[]) {
  const unicos = [...new Set(ids.filter((x): x is string => !!x))];
  const tipos = unicos.length
    ? await ctx.db.documentoTipo.findMany({ where: { id: { in: unicos } } })
    : [];
  return new Map(tipos.map((t) => [t.id, t]));
}

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
    // Alcance por filas (ADR-022): por entidad, exige que esté a cargo; sin entidad, acota a los
    // documentos de las entidades a cargo (null = sin alcance acotado, ve todo el tenant).
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
      // Alcance por dueño (ADR-022): un actor acotado solo ve los vinculados cuyo DUEÑO está a cargo,
      // igual que el resto de las consultas; un vínculo de referencia a una instalación a cargo no
      // debe exponer un documento de persona o de empresa. Sin alcance acotado (null), ve todos.
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
    const ancla = input.cursor
      ? await ctx.db.documento.findFirst({ where: { AND: [where, { id: input.cursor }] } })
      : null;
    if (input.cursor && !ancla) throw noEncontrado("La página pedida");
    const orden = [
      { venceEn: { sort: "asc" as const, nulls: "last" as const } },
      { createdAt: "desc" as const },
      { id: "asc" as const },
    ];
    const filas = await ctx.db.documento.findMany({
      where: ancla ? { AND: [where, desdeAncla("vence", ancla)] } : where,
      orderBy: orden,
      take: input.limite + 1,
    });
    const visibles = filas.slice(0, input.limite);
    const siguiente = filas.length > input.limite ? (visibles.at(-1)?.id ?? null) : null;
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
