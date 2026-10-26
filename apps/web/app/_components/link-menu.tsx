"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect } from "react";

import type { LinkComponent } from "@opai/ds";

import { ESPERA_ESQUELETO_MS } from "@/lib/cache-navegador";

/**
 * Hijo invisible de un <Link> del menú: si la navegación sigue pendiente pasado el retraso, marca
 * <html> y el CSS cambia el contenido por el esqueleto (`data-contenido` / `data-esqueleto`, ver
 * globals.css). Una navegación rápida no lo muestra nunca: sin destellos.
 */
let pendientes = 0;

function EstadoEnlace() {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    const raiz = document.documentElement;
    let marcado = false;
    const t = setTimeout(() => {
      marcado = true;
      pendientes++;
      raiz.setAttribute("data-navegando", "");
    }, ESPERA_ESQUELETO_MS);
    return () => {
      clearTimeout(t);
      if (marcado && --pendientes === 0) raiz.removeAttribute("data-navegando");
    };
  }, [pending]);
  return null;
}

/**
 * Enlaces del menú. El prefetch automático de Next queda desactivado (`prefetch={false}`).
 *
 * Por qué (cuelgue de #44): con Cache Components, un `prefetch` en vuelo en el instante del clic entra
 * en carrera con la navegación —el router pide el RSC del destino una y otra vez y nunca lo aplica, y
 * la página se queda en la anterior hasta el timeout—. La ventana de carrera es la hidratación de la
 * página recién cargada (su prefetch de enlaces aún en vuelo) y, en móvil, el toque y el clic como un
 * solo gesto. Sin prefetch en vuelo la navegación va bajo demanda (medido < 100 ms de servidor) y el
 * esqueleto cubre cualquier espera (`EstadoEnlace`). Se mantiene el objetivo de ADR-045 (shell
 * persistente, esqueleto inmediato, ≤ 8 consultas y ≤ 500 ms), adaptando el medio (ver PR).
 */
export const LinkMenu: LinkComponent = ({ href, className, children, ...rest }) => {
  return (
    <Link href={href} className={className} prefetch={false} {...rest}>
      {children}
      <EstadoEnlace />
    </Link>
  );
};
