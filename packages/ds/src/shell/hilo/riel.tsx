import { cn } from "../../cn";
import type { LinkComponent } from "../types";
import { BTN_ICONO } from "./estilos";
import { IconoHilo } from "./iconos";

type Props = {
  monograma: string;
  inicioHref: string;
  /** Pendientes sin resolver; `null` mientras no se sabe (no se pinta el globo). */
  pendientes: number | null;
  onPortales: () => void;
  onIndice: () => void;
  onTema: () => void;
  Link: LinkComponent;
  className?: string;
};

/** El hilo plegado (72 px): vuelve al hilo con su cuenta de pendientes, Índice y tema. */
export function RielHilo(p: Props) {
  const { Link } = p;
  const n = p.pendientes ?? 0;
  return (
    <nav
      aria-label="Hilo plegado"
      className={cn(
        "w-[72px] flex-none flex-col items-center gap-2 border-r border-border py-3.5",
        p.className,
      )}
    >
      <button
        type="button"
        onClick={p.onPortales}
        aria-label="Cambiar de portal o de empresa"
        className="mb-2 inline-flex size-11 items-center justify-center rounded-[12px]"
      >
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-[11px] bg-fg px-1.5 text-xs font-bold text-bg">
          {p.monograma}
        </span>
      </button>
      <Link
        href={p.inicioHref}
        aria-label={n > 0 ? `Volver al hilo: ${n} ${n === 1 ? "pendiente" : "pendientes"}` : "Volver al hilo"}
        className="relative flex size-14 flex-col items-center justify-center gap-0.5 rounded-[14px] text-fg transition-colors hover:bg-fill"
      >
        <IconoHilo nombre="hilo" />
        <span className="t-hilo-mini">Hilo</span>
        {n > 0 ? (
          <span className="absolute top-1 right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-mono t-hilo-mini font-semibold text-accent-fg tabular-nums">
            {n > 99 ? "99+" : n}
          </span>
        ) : null}
      </Link>
      <button type="button" onClick={p.onIndice} aria-label="Índice de todo el portal" className={BTN_ICONO}>
        <IconoHilo nombre="indice" />
      </button>
      <button
        type="button"
        onClick={p.onTema}
        aria-label="Cambiar entre tema claro y oscuro"
        className={cn(BTN_ICONO, "mt-auto")}
      >
        <IconoHilo nombre="luna" />
      </button>
    </nav>
  );
}
