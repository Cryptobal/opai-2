import { z } from "zod";

import { ESTADOS_NOVEDAD_LIBRO, GRAVEDADES_NOVEDAD_LIBRO, codigoNovedad } from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import { externo } from "../../externo";
import type { Contexto } from "../../types";
import { instalacionesEnAlcance } from "../maestros/alcance";
import { cursorDe, pagina } from "../maestros/comun";
import { iso } from "./hechos-comun";

type LibroNovedad = Awaited<ReturnType<Contexto["db"]["libroNovedad"]["findFirstOrThrow"]>>;

export const gravedadNovedadSchema = z.enum(GRAVEDADES_NOVEDAD_LIBRO);
export const estadoNovedadSchema = z.enum(ESTADOS_NOVEDAD_LIBRO);

/** Punto y tipo de Rondas: solo con el módulo activo, el punto de la misma instalación y el tipo activo. */
export async function gravedadDeRondas(
  ctx: Contexto,
  e: {
    instalacionId: string;
    puntoId?: string | undefined;
    tipoIncidenteId?: string | undefined;
  },
): Promise<string | undefined> {
  if (!e.puntoId && !e.tipoIncidenteId) return undefined;
  if (!ctx.modulosActivos.includes("rondas"))
    throw reglaDeNegocio(
      "Para enlazar un punto o un tipo de incidente, el módulo Rondas debe estar activo.",
    );
  if (e.puntoId) {
    const p = await ctx.db.puntoControl.findFirst({
      where: { id: e.puntoId, instalacionId: e.instalacionId, estado: "activo" },
      select: { id: true },
    });
    if (!p) throw noEncontrado("El punto de control");
  }
  if (!e.tipoIncidenteId) return undefined;
  const t = await ctx.db.tipoIncidente.findFirst({
    where: { id: e.tipoIncidenteId, activo: true },
    select: { gravedadDefecto: true },
  });
  if (!t) throw noEncontrado("El tipo de incidente");
  return t.gravedadDefecto;
}

export const novedadSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  instalacionId: z.string(),
  modulo: z.string(),
  origen: z.string(),
  gravedad: gravedadNovedadSchema,
  estado: estadoNovedadSchema,
  // Texto que escribió una persona en terreno: dato, nunca instrucción.
  resumen: externo(z.string()),
  detalle: externo(z.string().nullable()),
  ejecucionId: z.string().nullable(),
  puntoId: z.string().nullable(),
  tipoIncidenteId: z.string().nullable(),
  dispositivoId: z.string().nullable(),
  personaId: z.string().nullable(),
  usuarioId: z.string().nullable(),
  horaHecho: z.string(),
  registradaEn: z.string(),
});

export function vistaNovedad(n: LibroNovedad): z.infer<typeof novedadSchema> {
  return {
    id: n.id,
    codigo: codigoNovedad(n.numero),
    instalacionId: n.instalacionId,
    modulo: n.modulo,
    origen: n.origen,
    gravedad: gravedadNovedadSchema.parse(n.gravedad),
    estado: estadoNovedadSchema.parse(n.estado),
    resumen: n.resumen,
    detalle: n.detalle,
    ejecucionId: n.ejecucionId,
    puntoId: n.puntoId,
    tipoIncidenteId: n.tipoIncidenteId,
    dispositivoId: n.dispositivoId,
    personaId: n.personaId,
    usuarioId: n.usuarioId,
    horaHecho: iso(n.horaHecho),
    registradaEn: iso(n.createdAt),
  };
}

export const salidaListaNovedadesSchema = z.object({
  items: z.array(novedadSchema),
  siguiente: z.string().nullable(),
});

/** Página de filas del libro ya mapeadas a la vista de lista (CAR-353). */
export function paginaNovedadesLibro(filas: LibroNovedad[], limite: number, cursor?: string) {
  const p = pagina(filas, limite, cursor);
  return { items: p.items.map(vistaNovedad), siguiente: p.siguiente };
}

/** Una novedad de esta empresa dentro del alcance del actor (ADR-022), o NOT_FOUND sin revelar que existe. */
export async function novedadEnAlcance(ctx: Contexto, id: string): Promise<LibroNovedad> {
  const alcance = instalacionesEnAlcance(ctx);
  const n = await ctx.db.libroNovedad.findFirst({
    where: { id, ...(alcance ? { instalacionId: { in: [...alcance] } } : {}) },
  });
  if (!n) throw noEncontrado("La novedad");
  return n;
}

export type LibroNovedadInsertada = { id: string; numero: number; gravedad: string };

/** Inserta filas del libro con idempotencia por clave; devuelve solo las realmente creadas. */
export async function insertarLibroNovedades(
  tx: Contexto["db"],
  data: NonNullable<
    Parameters<Contexto["db"]["libroNovedad"]["createManyAndReturn"]>[0]["data"]
  >,
): Promise<LibroNovedadInsertada[]> {
  const filas = Array.isArray(data) ? data : [data];
  if (filas.length === 0) return [];
  return tx.libroNovedad.createManyAndReturn({
    skipDuplicates: true,
    data: filas,
    select: { id: true, numero: true, gravedad: true },
  });
}

export async function emitirLibroRegistrada(
  ctx: Contexto,
  tx: Contexto["db"],
  instalacionId: string,
  nuevas: readonly LibroNovedadInsertada[],
) {
  for (const n of nuevas) {
    await ctx.eventos.emitir(tx, {
      tipo: "core.libro_novedades.registrada",
      entidadTipo: "libro_novedad",
      entidadId: n.id,
      payload: { instalacionId, numero: n.numero, gravedad: n.gravedad },
    });
  }
}
