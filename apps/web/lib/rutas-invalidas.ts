import { esUuid } from "./ids";

/** Segmentos fijos que conviven con `[id]` en cada colección (no son ids). */
const FIJOS: Readonly<Record<string, readonly string[]>> = {
  personas: ["vencimientos", "nueva"],
  cuentas: ["nueva"],
  instalaciones: ["nueva"],
  cargos: ["nuevo", "nueva"],
};

/**
 * `/personas/abc`: el id no tiene forma de UUID, así que no puede existir. Se detecta en el proxy
 * para responder HTTP 404; dentro de la página el `notFound()` llega con el HTML ya en camino (el
 * shell se envía antes de leer `params`) y el estado quedaría en 200.
 */
export function esIdInvalido(pathname: string): boolean {
  const [coleccion, id] = pathname.split("/").filter(Boolean);
  if (!coleccion || id === undefined) return false;
  const fijos = FIJOS[coleccion];
  if (!fijos) return false;
  return !fijos.includes(id) && !esUuid(id);
}
