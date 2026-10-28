import { CeldaVigencia } from "@opai/ds";

import { chip } from "./tabla-matriz";

const item = "flex items-center gap-1.5";

/**
 * Leyenda del semáforo. En escritorio explica los íconos de la tabla; en teléfono, que lista solo
 * lo pendiente como etiquetas, explica esas etiquetas (nunca queda sin leyenda).
 */
export function LeyendaVencimientos() {
  return (
    <>
      <div className="hidden flex-wrap items-center gap-4 text-sm text-fg-muted md:flex">
        <span className={item}>
          <CeldaVigencia estado="vigente" /> Vigente
        </span>
        <span className={item}>
          <CeldaVigencia estado="por_vencer" dias={9} /> Por vencer (el número son los días que
          faltan)
        </span>
        <span className={item}>
          <CeldaVigencia estado="vencido" /> Vencido
        </span>
        <span className={item}>
          <CeldaVigencia estado="falta" /> Falta
        </span>
      </div>
      <div
        role="note"
        aria-label="Leyenda"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted md:hidden"
      >
        <span className={item}>
          <span className={chip("vencido")}>Vencido</span> ya venció
        </span>
        <span className={item}>
          <span className={chip("por_vencer")}>Por vencer · 9 días</span>
        </span>
        <span className={item}>
          <span className={chip("falta")}>Falta</span> sin documento
        </span>
      </div>
    </>
  );
}
