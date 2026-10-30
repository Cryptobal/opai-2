import Link from "next/link";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "./estado-enlace";

/**
 * Enlaces del menú y del riel. Precarga POR DEFECTO de Next (ADR-045 decisión 1, «precarga activa»;
 * mandato de Carlos t365u/t366u del 26-oct-2026 de no desactivarla). El layout del portal lee la
 * sesión (`identidadActual` → Better Auth) dentro de un `<Suspense>` (`portal-layout.tsx`), así que es
 * un hueco dinámico de Cache Components: la precarga por defecto solo trae el shell estático (el
 * fallback del Suspense), nunca ese hueco. Ya NO se fuerza `prefetch` completo por intención
 * (hover/toque/foco): forzarlo renderizaba en el servidor —y consultaba Better Auth y las capacidades
 * de— páginas del menú que nadie abría (los P2028 de `/negocios`, `/personas` y `/cuentas` del QA en
 * vivo del #136, todas entradas de menú; B1, 5.º ajuste). `EstadoEnlace` sigue dando la respuesta
 * inmediata al clic (marca el riel y el título de destino) y, con `conEsqueleto`, cubre la espera del
 * contenido con el esqueleto.
 */
export const LinkMenu: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
    <EstadoEnlace href={href} conEsqueleto />
  </Link>
);
