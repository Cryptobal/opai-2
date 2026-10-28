import { z } from "zod";

import { defineCapability } from "../define";
import { cursorDe, listaSchema, pagina } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { PERMISO_READ, embudoPorDefecto, negocioSchema, vistaNegocio } from "./comun";

const filtros = listaSchema.extend({
  cuentaId: z.uuid().optional().describe("Filtra por cuenta (ficha de cuenta)."),
  instalacionId: z
    .uuid()
    .optional()
    .describe("Filtra por instalación vinculada (ficha de instalación)."),
  etapaId: z.uuid().optional().describe("Filtra por etapa del embudo."),
  responsableId: z.uuid().optional().describe("Filtra por responsable."),
  origenId: z.uuid().optional().describe("Filtra por origen."),
  estado: z.enum(["abierto", "ganado", "perdido"]).optional(),
});

const filaLista = negocioSchema.extend({
  cuentaNombre: z.string(),
  etapaNombre: z.string(),
});

/** Nombres de cuenta y etapa para un conjunto de negocios, en dos consultas. */
async function enriquecer(ctx: Contexto, negocios: { cuentaId: string; etapaId: string }[]) {
  const cuentaIds = [...new Set(negocios.map((n) => n.cuentaId))];
  const etapaIds = [...new Set(negocios.map((n) => n.etapaId))];
  const [cuentas, etapas] = await Promise.all([
    ctx.db.cuenta.findMany({
      where: { id: { in: cuentaIds } },
      select: { id: true, nombre: true },
    }),
    ctx.db.etapa.findMany({ where: { id: { in: etapaIds } }, select: { id: true, nombre: true } }),
  ]);
  const nombre = (lista: { id: string; nombre: string }[], id: string) =>
    lista.find((x) => x.id === id)?.nombre ?? "";
  return (n: { cuentaId: string; etapaId: string }) => ({
    cuentaNombre: nombre(cuentas, n.cuentaId),
    etapaNombre: nombre(etapas, n.etapaId),
  });
}

export const negociosList = defineCapability({
  auditarLectura: (s) => s.items.flatMap((n) => [n.id, n.cuentaId]),
  id: "comercial.negocios.list",
  descripcion:
    "Lista los negocios (oportunidades de venta) de la empresa con filtros por etapa, responsable, origen y estado, paginada por cursor.",
  permiso: PERMISO_READ,
  input: filtros,
  output: z.object({ items: z.array(filaLista), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const q = input.q;
    // Filtro por instalación vinculada: resuelve los negocios de esa instalación (ficha de instalación).
    const porInstalacion = input.instalacionId
      ? (
          await ctx.db.negocioInstalacion.findMany({
            where: { instalacionId: input.instalacionId },
          })
        ).map((v) => v.negocioId)
      : null;
    const filas = await ctx.db.negocio.findMany({
      where: {
        ...(input.incluirArchivadas ? {} : { archivadoEn: null }),
        ...(input.cuentaId ? { cuentaId: input.cuentaId } : {}),
        ...(porInstalacion ? { id: { in: porInstalacion } } : {}),
        ...(input.etapaId ? { etapaId: input.etapaId } : {}),
        ...(input.responsableId ? { responsableId: input.responsableId } : {}),
        ...(input.origenId ? { origenId: input.origenId } : {}),
        ...(input.estado ? { estado: input.estado } : {}),
        ...(q ? { titulo: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    const extra = await enriquecer(ctx, p.items);
    return {
      items: p.items.map((n) => ({ ...vistaNegocio(n), ...extra(n) })),
      siguiente: p.siguiente,
    };
  },
});

export const negociosEmbudo = defineCapability({
  auditarLectura: (s) => s.negocios.flatMap((n) => [n.id, n.cuentaId]),
  id: "comercial.negocios.embudo",
  descripcion:
    "Resumen del embudo por defecto para el tablero: sus etapas con tipo, orden y probabilidad, y los negocios no archivados de cada etapa (los 500 más recientes).",
  permiso: PERMISO_READ,
  input: z.object({ responsableId: z.uuid().optional() }),
  output: z.object({
    etapas: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        tipo: z.string(),
        orden: z.number(),
        probabilidad: z.number(),
        tono: z.string(),
      }),
    ),
    negocios: z.array(negocioSchema.extend({ cuentaNombre: z.string(), etapaNombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const embudo = await embudoPorDefecto(ctx);
    const etapas = await ctx.db.etapa.findMany({
      where: { embudoId: embudo.id, activa: true },
      orderBy: { orden: "asc" },
    });
    const negocios = await ctx.db.negocio.findMany({
      where: {
        embudoId: embudo.id,
        archivadoEn: null,
        ...(input.responsableId ? { responsableId: input.responsableId } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
    });
    const extra = await enriquecer(ctx, negocios);
    return {
      etapas: etapas.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        orden: e.orden,
        probabilidad: e.probabilidad,
        tono: e.tono,
      })),
      negocios: negocios.map((n) => ({ ...vistaNegocio(n), ...extra(n) })),
    };
  },
});
