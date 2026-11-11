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

/**
 * Cabecera del hilo (maqueta corregida, CAR-317): la identidad (empresa, portal y persona) es el
 * selector que abre Portales; a la derecha, Inicio, Índice y el tema (desde 1024 px).
 */
export function CabeceraHilo(p: Props) {
  const { Link } = p;
  return (
    <div className={cn("flex flex-none items-center gap-2 pt-3 pb-0.5", PAD_HILO)}>
      <button
        type="button"
        onClick={p.onPortales}
        aria-label={`${p.sujeto}, ${p.sujetoSub}. Cambiar de portal o de empresa`}
        className="-ml-1.5 flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] py-1 pr-1 pl-1.5 text-left transition-colors hover:bg-fill"
      >
        <span className="inline-flex h-9 min-w-9 flex-none items-center justify-center rounded-md bg-fg px-[7px] t-hilo-monograma text-bg">
          {p.monograma}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate t-hilo-sujeto text-fg">
              {p.sujeto}
            </span>
            <IconoHilo
              nombre="selector"
              tam={14}
              data-icono="selector"
              className="flex-none text-fg-muted"
            />
          </span>
          <span className="truncate text-xs text-fg-muted">{p.sujetoSub}</span>
        </span>
      </button>
      <div className="flex flex-none items-center">
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
          className={cn(BTN_ICONO, "hidden lg:inline-flex")}
        >
          <IconoHilo nombre="luna" />
        </button>
      </div>
    </div>
  );
}
