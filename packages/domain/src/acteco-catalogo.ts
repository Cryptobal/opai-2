// Búsqueda en el catálogo ACTECO del SII (CAR-243). Solo servidor: se importa por `@opai/domain/acteco-catalogo`, nunca
// desde el índice del paquete, para que las ~670 glosas no entren al JS del cliente.
import { formatearActeco } from "./acteco";
import { CATALOGO_ACTECO, RUBROS_ACTECO } from "./generated/acteco-catalogo";

export type EntradaActeco = { codigo: number; glosa: string; rubro: string };

const sinTildes = (t: string) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();

const ENTRADAS: readonly (EntradaActeco & { clave: string })[] = CATALOGO_ACTECO.map(([codigo, glosa, rubro]) => ({
  codigo,
  glosa,
  rubro: RUBROS_ACTECO[rubro] ?? "",
  clave: sinTildes(`${glosa} ${RUBROS_ACTECO[rubro] ?? ""}`),
}));
const POR_CODIGO = new Map(ENTRADAS.map((e) => [e.codigo, e]));

const limpio = ({ codigo, glosa, rubro }: EntradaActeco): EntradaActeco => ({ codigo, glosa, rubro });

/** Total de códigos del catálogo. */
export const TOTAL_CATALOGO_ACTECO = ENTRADAS.length;

/** La entrada del catálogo para un código, o null si no está (un código escrito a mano puede no estar). */
export function actecoDelCatalogo(codigo: number): EntradaActeco | null {
  const e = POR_CODIGO.get(codigo);
  return e ? limpio(e) : null;
}

/**
 * Busca por código o por palabras de la glosa o del rubro, sin distinguir mayúsculas ni tildes. Con dígitos, busca los
 * códigos que empiezan así (con o sin el cero inicial: «8010» y «08010» encuentran 801001); con palabras, exige todas.
 * Sin texto devuelve los primeros del catálogo. Una coincidencia exacta de código va primero.
 */
export function buscarActecos(q: string, limite = 20): EntradaActeco[] {
  const t = sinTildes(q);
  const tope = Math.max(1, Math.min(limite, 50));
  if (!t) return ENTRADAS.slice(0, tope).map(limpio);
  const digitos = t.replace(/[\s.]/g, "");
  if (/^\d{1,6}$/.test(digitos)) {
    const sinCero = digitos.replace(/^0+(?=\d)/, "");
    const r = ENTRADAS.filter((e) => {
      const seis = formatearActeco(e.codigo);
      return seis.startsWith(digitos) || String(e.codigo).startsWith(sinCero);
    });
    const exacto = Number(digitos);
    return [...r.filter((e) => e.codigo === exacto), ...r.filter((e) => e.codigo !== exacto)].slice(0, tope).map(limpio);
  }
  const palabras = t.split(" ");
  return ENTRADAS.filter((e) => palabras.every((p) => e.clave.includes(p)))
    .slice(0, tope)
    .map(limpio);
}
