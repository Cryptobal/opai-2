import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { entidadEnAlcance } from "../maestros/alcance";
import { hoy } from "../maestros/comun";
import { documentosEnAlcance, entidadesEnAlcance, vinculoEnAlcance } from "./alcance-doc";
import { CAPA_DE } from "./entidad";
import { docsDeCumplimiento, esDocCumplimiento, puedeVerCumplimiento } from "./sensibles";
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
    // Alcance por filas (ADR-022): por entidad, exige que esté a cargo; sin entidad, acota a los
    // documentos de las entidades a cargo (null = sin alcance acotado, ve todo el tenant).
    if (input.entidad && !(await entidadEnAlcance(ctx, input.entidad.tipo, input.entidad.id)))
      return { items: [], faltantes: [] };
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
    const docs = await ctx.db.documento.findMany({
      where: {
        estado: { in: estados },
        ...(ids ? { id: { in: [...ids] } } : {}),
        ...(input.tipoId ? { tipoId: input.tipoId } : {}),
      },
      orderBy: [{ venceEn: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    // Documentos de cumplimiento (Ley 21.719): la exportación del titular solo la lista
    // `cumplimiento.read`; con el `documentos.read` general (supervisor, viewer) no aparecen.
    const visibles = puedeVerCumplimiento(ctx)
      ? docs
      : await docsDeCumplimiento(
          ctx,
          docs.map((d) => d.id),
        ).then((ocultos) => docs.filter((d) => !ocultos.has(d.id)));
    const tipos = await tiposPorId(
      ctx,
      visibles.map((d) => d.tipoId),
    );
    const items = visibles
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
    // Documento de cumplimiento (p. ej. la exportación del titular): sin `cumplimiento.read` se
    // responde «no encontrado», sin revelar que existe (sin enumeración).
    if (!puedeVerCumplimiento(ctx) && (await esDocCumplimiento(ctx, d.id)))
      throw noEncontrado("El documento");
    // Alcance por filas: un actor acotado solo ve documentos cuyo dueño está a cargo.
    const alc = await entidadesEnAlcance(ctx);
    const permitidos = await documentosEnAlcance(ctx, alc);
    if (permitidos && !permitidos.includes(d.id)) throw noEncontrado("El documento");
    // Los vínculos que se devuelven se acotan al alcance: no se exponen ids de entidades ajenas
    // (una persona o una cuenta que el supervisor no tiene a cargo) aunque cuelguen del documento.
    const vinculosTodos = await ctx.db.documentoVinculo.findMany({ where: { documentoId: d.id } });
    const vinculos = alc
      ? vinculosTodos.filter((v) => vinculoEnAlcance(alc, v.entidadTipo, v.entidadId))
      : vinculosTodos;
    const versiones = [];
    for (let previo = d.reemplazaAId, n = 0; previo && n < 50; n++) {
      const v = await ctx.db.documento.findUnique({ where: { id: previo } });
      if (!v) break;
      // Mismo filtro que el documento: una versión fuera de alcance no se expone. Las versiones del
      // mismo dueño (el caso normal) sí aparecen, porque comparten su vínculo `propietario`.
      if (!permitidos || permitidos.includes(v.id)) versiones.push(v);
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
