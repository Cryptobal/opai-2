import { cn } from "../../cn";
import type { LinkComponent } from "../types";
import { BTN_ICONO, PAD_HILO } from "./estilos";
import { IconoHilo } from "./iconos";

type Props = {
  monograma: string;
  sujeto: string;
  sujetoSub: string;
  inicioHref: string;
  onPortales: () => void;
  /** En teléfono, «Inicio» abre el lienzo con la página de inicio del portal. */
  onInicio: () => void;
  onIndice: () => void;
  onTema: () => void;
  Link: LinkComponent;
};

/** Cabecera del hilo: de quién es (empresa, portal y persona), Portales, Inicio, Índice y tema. */
export function CabeceraHilo(p: Props) {
  const { Link } = p;
  return (
    <div className={cn("flex flex-none items-center gap-1 pt-3.5 pb-1", PAD_HILO)}>
      <button
        type="button"
        onClick={p.onPortales}
        aria-label={`${p.sujeto}, ${p.sujetoSub}. Cambiar de portal o de empresa`}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[12px] text-left"
      >
        <span className="inline-flex h-[34px] min-w-[34px] flex-none items-center justify-center rounded-md bg-fg px-1.5 text-xs font-bold text-bg">
          {p.monograma}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-semibold text-fg">{p.sujeto}</span>
          <span className="truncate text-xs text-fg-muted">{p.sujetoSub}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={p.onPortales}
        className="inline-flex h-11 flex-none items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold whitespace-nowrap text-fg transition-colors hover:bg-fill"
      >
        <IconoHilo nombre="cambio" tam={16} />
        <span>Portales</span>
      </button>
      <Link
        href={p.inicioHref}
        onClick={p.onInicio}
        aria-label="Inicio del portal"
        className={BTN_ICONO}
      >
        <IconoHilo nombre="pulso" />
      </Link>
      <button
        type="button"
        onClick={p.onIndice}
        aria-label="Índice de todo el portal"
        className={BTN_ICONO}
      >
        <IconoHilo nombre="indice" />
      </button>
      <button
        type="button"
        onClick={p.onTema}
        aria-label="Cambiar entre tema claro y oscuro"
        className={cn(BTN_ICONO, "hidden hilo:inline-flex")}
      >
        <IconoHilo nombre="luna" />
      </button>
    </div>
  );
}
