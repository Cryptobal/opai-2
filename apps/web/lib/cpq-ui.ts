import type { Identidad } from "./actor";
import { puedeDeIdentidad } from "./permisos-ui";

/** Visibilidad únicamente; las capacidades vuelven a autorizar cada operación en servidor. */
export function accesoCpq(identidad: Identidad | null) {
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  const leer = Boolean(identidad?.modulosActivos.includes("cpq")) && puede("cpq:cotizaciones.read");
  return { leer, crear: leer && puede("cpq:cotizaciones.manage") };
}
