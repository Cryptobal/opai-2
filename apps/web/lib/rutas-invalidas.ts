import { fichaDe } from "./existencia-ruta";
import { esUuid } from "./ids";

/** Portales con su propio 404 (ADR-044): cada uno tiene su catch-all bajo su prefijo. */
const PORTALES = ["trabajador", "cliente", "terreno", "supervisor", "platform"];

/**
 * `/personas/abc`: el id no tiene forma de UUID, así que no puede existir. Se detecta en el proxy
 * para responder HTTP 404; dentro de la página el `notFound()` llega con el HTML ya en camino (el
 * shell se envía antes de leer `params`) y el estado quedaría en 200. Lo que depende de la base
 * (UUID válido, slugs) lo consulta el proxy a `/api/existe` (`existencia-ruta.ts`). Las fichas
 * están en el registro `FICHAS`.
 */
export function esIdInvalido(pathname: string): boolean {
  const f = fichaDe(pathname);
  return f !== null && !esUuid(f.id);
}

/** Página a la que el proxy reescribe un 404: la del portal de la ruta, no la del ERP. */
export function destino404(pathname: string): string {
  const [primero] = pathname.split("/").filter(Boolean);
  return primero && PORTALES.includes(primero) ? `/${primero}/no-encontrado` : "/no-encontrado";
}
