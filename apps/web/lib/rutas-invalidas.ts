import { GRUPOS_IDS } from "@/app/(erp)/configuracion/_centro/grupos";

import { consultaDeRuta, fichaDe } from "./existencia-ruta";
import { esUuid } from "./ids";

/** Portales con su propio 404 (ADR-044): cada uno tiene su catch-all bajo su prefijo. */
const PORTALES = ["trabajador", "cliente", "terreno", "supervisor", "platform"];

/**
 * `/personas/abc`: el id no tiene forma de UUID, así que no puede existir; `/configuracion/grupo/xyz`
 * fuera de la lista cerrada, igual. Se detecta en el proxy sin tocar la base (brief §4.2, §5). Lo que
 * sí depende de la base (UUID válido, slugs de evento/integración) lo consulta el proxy a
 * `/api/existe` (`existencia-ruta.ts`). Las fichas están en el registro `FICHAS`.
 */
export function esIdInvalido(pathname: string): boolean {
  const consulta = consultaDeRuta(pathname);
  if (consulta?.tipo === "grupo")
    return !(GRUPOS_IDS as readonly string[]).includes(consulta.grupo);
  const f = fichaDe(pathname);
  return f !== null && !esUuid(f.id);
}

/** Página a la que el proxy reescribe un 404: la del portal de la ruta, no la del ERP. */
export function destino404(pathname: string): string {
  if (pathname.startsWith("/configuracion/grupo/")) return `/configuracion/no-encontrado?ruta=${encodeURIComponent(pathname)}`;
  const [primero] = pathname.split("/").filter(Boolean);
  return primero && PORTALES.includes(primero) ? `/${primero}/no-encontrado` : "/no-encontrado";
}
