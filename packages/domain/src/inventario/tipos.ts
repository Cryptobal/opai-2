// Catálogo de tipos de Inventario (CAR-235, ADR-116; referente Snipe-IT: categorías con campos propios).
// Dos categorías: «activo» se controla por unidad y lleva campos propios; «ropa» se controla por
// existencias y talla. Reglas R1 a R4 de docs/2.0/modulos/inventario.md.

export const CATEGORIAS_TIPO = ["activo", "ropa"] as const;
export type CategoriaTipo = (typeof CATEGORIAS_TIPO)[number];

export const TIPOS_CAMPO_INVENTARIO = ["texto", "numero", "fecha"] as const;
export type TipoCampoInventario = (typeof TIPOS_CAMPO_INVENTARIO)[number];

/** Campo propio de un tipo de activo: la clave es estable aunque cambie la etiqueta. */
export type CampoTipo = { clave: string; etiqueta: string; tipo: TipoCampoInventario; obligatorio: boolean };

export const LIMITES_TIPO = {
  nombreMin: 2,
  nombreMax: 80,
  descripcionMax: 300,
  campos: 12,
  etiquetaMin: 2,
  etiquetaMax: 40,
  tallas: 20,
  tallaMax: 10,
} as const;

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** R1: forma de comparar nombres (sin mayúsculas, tildes ni espacios de más). */
export function nombreNormalizado(nombre: string): string {
  return sinTildes(nombre).toLowerCase().trim().replace(/\s+/g, " ");
}

/** R4: clave estable de un campo a partir de su etiqueta («Número de serie» → «numero_de_serie»). */
export function claveCampo(etiqueta: string): string {
  const base = sinTildes(etiqueta)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[a-z]/.test(base) ? base : `c_${base}`.slice(0, 40);
}

type Definicion = {
  categoria: CategoriaTipo;
  campos: readonly CampoTipo[];
  tallas: readonly string[];
};

/** Talla tal como se guarda: sin espacios y en mayúsculas («x l» → «XL»). Es la clave de las existencias. */
export function normalizarTalla(talla: string): string {
  return talla.replace(/\s+/g, "").toUpperCase();
}

/** R3 y R4: el error de negocio del tipo, o null si es válido. */
export function errorDeTipo({ categoria, campos, tallas }: Definicion): string | null {
  if (categoria === "ropa") {
    if (campos.length > 0) return "Los campos propios son solo para tipos de activo.";
    if (tallas.length === 0) return "Un tipo de ropa necesita al menos una talla.";
    if (tallas.length > LIMITES_TIPO.tallas) return `Hasta ${LIMITES_TIPO.tallas} tallas por tipo.`;
    const vistas = new Set(tallas.map(normalizarTalla));
    if (vistas.size !== tallas.length) return "Hay tallas repetidas.";
    return null;
  }
  if (tallas.length > 0) return "Las tallas son solo para tipos de ropa.";
  if (campos.length > LIMITES_TIPO.campos) return `Hasta ${LIMITES_TIPO.campos} campos por tipo.`;
  if (campos.some((c) => !/[\p{L}\p{N}]/u.test(c.etiqueta))) return "El nombre de cada campo necesita letras o números.";
  const etiquetas = new Set(campos.map((c) => nombreNormalizado(c.etiqueta)));
  if (etiquetas.size !== campos.length) return "Hay campos con el mismo nombre.";
  if (new Set(campos.map((c) => c.clave)).size !== campos.length) return "Hay campos con la misma clave.";
  return null;
}

/**
 * Arma los campos guardados a partir de lo que llega: conserva la clave de los que ya existían
 * (por clave) y deriva la de los nuevos desde su etiqueta, sin repetir una clave en uso ni una ya
 * usada antes por el tipo (`usadas`), para que un campo nuevo nunca herede valores de otro.
 */
export function camposConClave(
  entrada: readonly { clave?: string | undefined; etiqueta: string; tipo: TipoCampoInventario; obligatorio: boolean }[],
  usadas: readonly string[] = [],
): CampoTipo[] {
  const tomadas = new Set([...usadas, ...entrada.flatMap((c) => (c.clave ? [c.clave] : []))]);
  return entrada.map((c) => {
    let clave = c.clave;
    if (!clave) {
      const base = claveCampo(c.etiqueta);
      clave = base;
      for (let n = 2; tomadas.has(clave); n++) clave = `${base.slice(0, 36)}_${n}`;
      tomadas.add(clave);
    }
    return { clave, etiqueta: c.etiqueta.trim(), tipo: c.tipo, obligatorio: c.obligatorio };
  });
}
