// Módulo Inventario (CAR-235, ADR-116): piezas compartidas por sus capacidades.
import {
  COMPORTAMIENTOS_CATEGORIA,
  LIMITES_TIPO,
  TIPOS_CAMPO_INVENTARIO,
  comportamientoDe,
  nombreCategoria,
  type CampoTipo,
  type CategoriaInventario,
  type ComportamientoCategoria,
} from "@opai/domain";
import { z } from "zod";

import type { Contexto } from "../types";

/** Permisos del módulo Inventario (declarados en su manifiesto). */
export const PERMISOS_INVENTARIO = {
  /** Ver tipos, activos y existencias. */
  read: "inventario:read",
  /** Configurar el catálogo de tipos de la empresa. */
  tiposManage: "inventario:tipos.manage",
  /** Registrar y mantener activos, existencias y entregas. */
  gestionar: "inventario:gestionar",
} as const;

export const campoSchema = z.object({
  clave: z.string(),
  etiqueta: z.string(),
  tipo: z.enum(TIPOS_CAMPO_INVENTARIO),
  obligatorio: z.boolean(),
});

/** Campo tal como llega: la clave solo viene en los que ya existían. */
export const campoEntradaSchema = z.object({
  clave: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,39}$/)
    .optional()
    .describe("Clave de un campo existente; se omite en los campos nuevos."),
  etiqueta: z.string().trim().min(LIMITES_TIPO.etiquetaMin).max(LIMITES_TIPO.etiquetaMax),
  tipo: z.enum(TIPOS_CAMPO_INVENTARIO).default("texto"),
  obligatorio: z.boolean().default(false),
});

export const tallaSchema = z.string().trim().min(1).max(LIMITES_TIPO.tallaMax);

export const tipoSchema = z.object({
  id: z.string(),
  categoria: z.string(),
  categoriaNombre: z.string(),
  comportamiento: z.enum(COMPORTAMIENTOS_CATEGORIA),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  campos: z.array(campoSchema),
  tallas: z.array(z.string()),
  prendaClave: z.string().nullable(),
  entregaAPersona: z.boolean(),
  activo: z.boolean(),
});
export type VistaTipo = z.infer<typeof tipoSchema>;

type FilaTipo = {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string | null;
  campos: unknown;
  tallas: string[];
  prendaClave: string | null;
  entregaAPersona: boolean;
  activo: boolean;
};

/** Lee los campos guardados; descarta lo que no tenga la forma esperada. */
export function camposGuardados(valor: unknown): CampoTipo[] {
  const r = z.array(campoSchema).safeParse(valor);
  return r.success ? r.data : [];
}

export function vistaTipo(f: FilaTipo, categorias: readonly CategoriaInventario[]): VistaTipo {
  const comportamiento: ComportamientoCategoria =
    comportamientoDe(f.categoria, categorias) ?? (f.categoria === "ropa" ? "ropa" : "activo");
  return {
    id: f.id,
    categoria: f.categoria,
    categoriaNombre: nombreCategoria(f.categoria, categorias),
    comportamiento,
    nombre: f.nombre,
    descripcion: f.descripcion,
    campos: camposGuardados(f.campos),
    tallas: f.tallas,
    prendaClave: f.prendaClave,
    entregaAPersona: f.entregaAPersona,
    activo: f.activo,
  };
}

/** Claves de categorías activas con un comportamiento dado. */
export function clavesPorComportamiento(
  categorias: readonly CategoriaInventario[],
  comportamiento: ComportamientoCategoria,
) {
  const claves = categorias.filter((c) => c.activo && c.comportamiento === comportamiento).map((c) => c.clave);
  return claves.length ? claves : [comportamiento];
}

export const nombreSchema = z
  .string()
  .trim()
  .min(LIMITES_TIPO.nombreMin)
  .max(LIMITES_TIPO.nombreMax);
export const descripcionSchema = z.string().trim().max(LIMITES_TIPO.descripcionMax);
export const prendaSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]{0,39}$/);
export const duplicado = (nombre: string) => `Ya existe un tipo llamado «${nombre}».`;

export const ID_VISTA_PREVIA = "00000000-0000-7000-8000-000000000000";

/** Entrada común de las listas (CAR-353): cursor opaco y tamaño de página. */
export const entradaLista = (limite: number) => ({
  cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
  limite: z.number().int().min(1).max(200).default(limite),
});

/** Salida común de las listas: la página y el cursor siguiente (nulo en la última). */
export const salidaLista = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), siguiente: z.string().nullable() });

/** Corta la fila de más y arma el cursor siguiente con la clave de orden. */
export function paginaPor<T>(filas: T[], limite: number, clave: (f: T) => string) {
  const items = filas.slice(0, limite);
  const ultima = items.at(-1);
  return { items, siguiente: filas.length > limite && ultima ? clave(ultima) : null };
}

/** Página de tipos ordenados por nombre (catálogo y existencias de ropa). */
export async function tiposPorNombre(
  ctx: Contexto,
  filtro: { categoria?: string | { in: string[] }; activo?: boolean },
  cursor: string | undefined,
  limite: number,
) {
  const filas = await ctx.db.inventarioTipo.findMany({
    where: { ...filtro, ...(cursor ? { nombreNormalizado: { gt: cursor } } : {}) },
    orderBy: { nombreNormalizado: "asc" },
    take: limite + 1,
  });
  return paginaPor(filas, limite, (f) => f.nombreNormalizado);
}
