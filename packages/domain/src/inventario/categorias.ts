// Categorías configurables de tipos de inventario (CAR-743): cada empresa define las suyas; el
// comportamiento base (activo o ropa) fija las reglas del tipo.
import { claveCampo } from "./tipos";

export const COMPORTAMIENTOS_CATEGORIA = ["activo", "ropa"] as const;
export type ComportamientoCategoria = (typeof COMPORTAMIENTOS_CATEGORIA)[number];

export const CLAVE_CATEGORIA = /^[a-z][a-z0-9_]{0,39}$/;

export type CategoriaInventario = {
  clave: string;
  nombre: string;
  comportamiento: ComportamientoCategoria;
  activo: boolean;
  orden: number;
};

export const LIMITES_CATEGORIA = { max: 20, nombreMin: 2, nombreMax: 40 } as const;

export const CATEGORIAS_DEFECTO: readonly CategoriaInventario[] = [
  { clave: "activo", nombre: "Activo", comportamiento: "activo", activo: true, orden: 0 },
  { clave: "ropa", nombre: "Ropa", comportamiento: "ropa", activo: true, orden: 1 },
];

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Clave estable si no viene en el valor guardado. */
export function claveCategoria(nombre: string): string {
  const base = sinTildes(nombre)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[a-z]/.test(base) ? base : `c_${base}`.slice(0, 40);
}

type Entrada = { clave?: string; nombre: string; comportamiento: ComportamientoCategoria; activo?: boolean; orden?: number };

/** Conserva claves al renombrar categorías personalizadas. */
export function categoriasNormalizadas(
  entrada: readonly Entrada[],
  previo: readonly Entrada[] = [],
): CategoriaInventario[] | null {
  if (entrada.length > LIMITES_CATEGORIA.max) return null;
  const claves = new Set<string>();
  const salida: CategoriaInventario[] = [];
  for (let i = 0; i < entrada.length; i++) {
    const x = entrada[i]!;
    const nombre = x.nombre.trim();
    if (nombre.length < LIMITES_CATEGORIA.nombreMin || nombre.length > LIMITES_CATEGORIA.nombreMax)
      return null;
    if (!COMPORTAMIENTOS_CATEGORIA.includes(x.comportamiento)) return null;
    let clave = typeof x.clave === "string" && CLAVE_CATEGORIA.test(x.clave) ? x.clave : "";
    if (!clave) {
      const anterior = previo.find(
        (p) => p.nombre.trim().toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"),
      );
      clave =
        anterior && typeof anterior.clave === "string" && CLAVE_CATEGORIA.test(anterior.clave)
          ? anterior.clave
          : claveCategoria(nombre);
    }
    if (!CLAVE_CATEGORIA.test(clave) || claves.has(clave)) return null;
    claves.add(clave);
    const orden = typeof x.orden === "number" && Number.isInteger(x.orden) ? x.orden : i;
    salida.push({
      clave,
      nombre,
      comportamiento: x.comportamiento,
      activo: x.activo !== false,
      orden,
    });
  }
  const nombres = new Set(entrada.map((p) => p.nombre.trim().toLocaleLowerCase("es")));
  if (nombres.size !== entrada.length) return null;
  return salida.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
}

/** Normaliza la lista guardada; null si hay duplicados o datos inválidos. */
export function categoriasValidas(valor: unknown): CategoriaInventario[] | null {
  if (!Array.isArray(valor)) return null;
  return categoriasNormalizadas(valor as Entrada[]);
}

/** Lista efectiva: la del tenant si es válida y no vacía; si no, activo y ropa por defecto. */
export function categoriasEfectivas(propio: unknown): CategoriaInventario[] {
  const r = categoriasValidas(propio);
  return r?.length ? r : [...CATEGORIAS_DEFECTO];
}

export function comportamientoDe(
  clave: string,
  categorias: readonly CategoriaInventario[],
): ComportamientoCategoria | null {
  const c = categorias.find((x) => x.clave === clave);
  if (c) return c.comportamiento;
  if (clave === "activo" || clave === "ropa") return clave;
  return null;
}

export function nombreCategoria(clave: string, categorias: readonly CategoriaInventario[]): string {
  return categorias.find((c) => c.clave === clave)?.nombre ?? clave;
}

/** Igual que campos de tipo: clave estable al renombrar la categoría personalizada. */
export function claveCategoriaNueva(etiqueta: string, tomadas: ReadonlySet<string>): string {
  const base = claveCampo(etiqueta);
  let clave = base;
  for (let n = 2; tomadas.has(clave); n++) clave = `${base.slice(0, 36)}_${n}`;
  return clave;
}