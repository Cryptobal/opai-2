"use client";

import { ControlesFiltroNovedades } from "./controles-filtro-novedades";

export type FiltroNovedades = "todas" | "no_leidas";

/**
 * Resumen, filtros «Todas / No leídas» y por módulo, y marcar leídas (CAR-245, CAR-569).
 * Los filtros son locales sobre la lista del usuario.
 */
export function EncabezadoNovedades(
  props: Parameters<typeof ControlesFiltroNovedades>[0],
) {
  const { noLeidas } = props;
  return (
    <div className="flex flex-col gap-3">
      <ControlesFiltroNovedades {...props} />
      <p className="t-body text-fg-muted" aria-live="polite">
        {noLeidas > 0
          ? `${noLeidas} ${noLeidas === 1 ? "novedad sin leer" : "novedades sin leer"}`
          : "Estás al día: leíste todas las novedades."}
      </p>
    </div>
  );
}