import { esUuid } from "./ids";

/**
 * Registro de fichas con `[id]`: cada módulo agrega aquí una línea para tener 404 real (HTTP) en su
 * ficha. `base` es la ruta de la lista, `fijos` los segmentos que conviven con `[id]` (no son ids)
 * y `portal` el portal con el que se lee (el alcance se aplica en la capacidad, ADR-022).
 */
export const FICHAS = [
  { base: ["personas"], coleccion: "personas", fijos: ["vencimientos", "nueva"] },
  { base: ["cuentas"], coleccion: "cuentas", fijos: ["nueva"] },
  { base: ["instalaciones"], coleccion: "instalaciones", fijos: ["nueva"] },
  { base: ["cargos"], coleccion: "cargos", fijos: ["nuevo", "nueva"] },
  { base: ["configuracion", "agentes"], coleccion: "agentes", fijos: ["conectar"] },
  { base: ["supervisor", "instalaciones"], coleccion: "terreno-instalaciones", fijos: [] },
  { base: ["supervisor", "personas"], coleccion: "terreno-personas", fijos: [] },
] as const;

export type Coleccion = (typeof FICHAS)[number]["coleccion"];

/** `/personas/<id>/laboral` → { coleccion: "personas", id }; null si la ruta no es una ficha. */
export function fichaDe(pathname: string): { coleccion: Coleccion; id: string } | null {
  const seg = pathname.split("/").filter(Boolean);
  for (const f of FICHAS) {
    const id = seg[f.base.length];
    if (id === undefined || !f.base.every((b, i) => seg[i] === b)) continue;
    if ((f.fijos as readonly string[]).includes(id)) return null;
    return { coleccion: f.coleccion, id };
  }
  return null;
}

export type Consulta =
  | { tipo: "ficha"; coleccion: Coleccion; id: string }
  | { tipo: "evento"; evento: string }
  | { tipo: "integracion"; proveedor: string }
  | { tipo: "grupo"; grupo: string };

/**
 * Páginas cuyo 404 depende de la base: ficha con UUID válido (`/personas/<uuid>/laboral`), plantilla
 * de un evento o detalle de una integración. Devuelve qué consultar, o null si la ruta no es de
 * esas (el proxy no hace nada). Es pura: el proxy la usa sin importar capacidades.
 */
export function consultaDeRuta(pathname: string): Consulta | null {
  const ficha = fichaDe(pathname);
  if (ficha) return esUuid(ficha.id) ? { tipo: "ficha", ...ficha } : null;
  const [a, b, c] = pathname.split("/").filter(Boolean);
  if (!a || !b) return null;
  if (a !== "configuracion" || !c) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(c);
  } catch {
    return null; // %-encoding malformado: no es un slug válido; la página responde por su cuenta
  }
  if (b === "comunicaciones") return { tipo: "evento", evento: slug };
  if (b === "integraciones") return { tipo: "integracion", proveedor: slug };
  // `/configuracion/grupo/<id>`: un id de grupo fuera de la lista cerrada da 404 (brief §4.2, §5).
  if (b === "grupo") return { tipo: "grupo", grupo: slug };
  return null;
}
