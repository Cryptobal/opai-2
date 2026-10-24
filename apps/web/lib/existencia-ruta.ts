import { esUuid } from "./ids";

/** Colecciones con ficha `[id]`. */
export const COLECCIONES = ["personas", "cuentas", "instalaciones", "cargos"] as const;
export type Coleccion = (typeof COLECCIONES)[number];
const esColeccion = (a: string): a is Coleccion => (COLECCIONES as readonly string[]).includes(a);

export type Consulta =
  | { tipo: "ficha"; coleccion: Coleccion; id: string }
  | { tipo: "evento"; evento: string }
  | { tipo: "integracion"; proveedor: string };

/**
 * Páginas cuyo 404 depende de la base: ficha con UUID válido (`/personas/<uuid>/laboral`), plantilla
 * de un evento o detalle de una integración. Devuelve qué consultar, o null si la ruta no es de
 * esas (el proxy no hace nada). Es pura: el proxy la usa sin importar capacidades.
 */
export function consultaDeRuta(pathname: string): Consulta | null {
  const [a, b, c] = pathname.split("/").filter(Boolean);
  if (!a || !b) return null;
  if (esColeccion(a)) return esUuid(b) ? { tipo: "ficha", coleccion: a, id: b } : null;
  if (a !== "configuracion" || !c) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(c);
  } catch {
    return null; // %-encoding malformado: no es un slug válido; la página responde por su cuenta
  }
  if (b === "comunicaciones") return { tipo: "evento", evento: slug };
  if (b === "integraciones") return { tipo: "integracion", proveedor: slug };
  return null;
}
