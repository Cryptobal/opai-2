import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { hoy } from "../maestros/comun";
import { CAPA_DE } from "./entidad";
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
  id: "core.documentos.list",
  descripcion:
    "Documentos vigentes (última versión) de una entidad —empresa, cuenta, instalación, persona o puesto— o de todo el tenant, con estado de vigencia; por entidad incluye los tipos obligatorios que faltan.",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({
    entidad: entidadSchema.optional(),
    tipoId: uuidSchema.optional(),
    vigencia: z.enum(["vigente", "por_vencer", "vencido", "sin_fecha"]).optional(),
    incluirArchivados: z.boolean().default(false),
  }),
  output: z.object({
    items: z.array(documentoSchema),
    faltantes: z.array(z.object({ tipoId: z.string(), nombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ids = input.entidad
      ? (
          await ctx.db.documentoVinculo.findMany({
            where: { entidadTipo: input.entidad.tipo, entidadId: input.entidad.id },
            select: { documentoId: true },
          })
        ).map((v) => v.documentoId)
      : null;
    const estados = input.incluirArchivados ? ["disponible", "archivado"] : ["disponible"];
    const docs = await ctx.db.documento.findMany({
      where: {
        estado: { in: estados },
        ...(ids ? { id: { in: ids } } : {}),
        ...(input.tipoId ? { tipoId: input.tipoId } : {}),
      },
      orderBy: [{ venceEn: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    const tipos = await tiposPorId(
      ctx,
      docs.map((d) => d.tipoId),
    );
    const items = docs
      .map((d) => vistaDocumento(d, d.tipoId ? tipos.get(d.tipoId) : null, hoy()))
      .filter((d) => !input.vigencia || d.vigencia === input.vigencia);
    let faltantes: { tipoId: string; nombre: string }[] = [];
    if (input.entidad) {
      const obligatorios = await ctx.db.documentoTipo.findMany({
        where: { capa: CAPA_DE[input.entidad.tipo], obligatorio: true, activo: true },
        orderBy: { orden: "asc" },
      });
      const presentes = new Set(docs.map((d) => d.tipoId));
      faltantes = obligatorios
        .filter((t) => !presentes.has(t.id))
        .map((t) => ({ tipoId: t.id, nombre: t.nombre }));
    }
    return { items, faltantes };
  },
});

export const documentosGet = defineCapability({
  id: "core.documentos.get",
  descripcion:
    "Un documento con sus vínculos (propietario y referencias) y la cadena de versiones anteriores.",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({ id: uuidSchema }),
  output: documentoSchema.extend({
    vinculos: z.array(
      z.object({ entidadTipo: z.string(), entidadId: z.string(), rol: z.string() }),
    ),
    versiones: z.array(documentoSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const d = await ctx.db.documento.findUnique({ where: { id: input.id } });
    if (!d) throw noEncontrado("El documento");
    const vinculos = await ctx.db.documentoVinculo.findMany({ where: { documentoId: d.id } });
    const versiones = [];
    for (let previo = d.reemplazaAId, n = 0; previo && n < 50; n++) {
      const v = await ctx.db.documento.findUnique({ where: { id: previo } });
      if (!v) break;
      versiones.push(v);
      previo = v.reemplazaAId;
    }
    const tipos = await tiposPorId(ctx, [d.tipoId, ...versiones.map((v) => v.tipoId)]);
    const vista = (x: typeof d) => vistaDocumento(x, x.tipoId ? tipos.get(x.tipoId) : null, hoy());
    return {
      ...vista(d),
      vinculos: vinculos.map((v) => ({
        entidadTipo: v.entidadTipo,
        entidadId: v.entidadId,
        rol: v.rol,
      })),
      versiones: versiones.map(vista),
    };
  },
});
