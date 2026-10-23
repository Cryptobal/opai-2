import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { type LinkComponent, LinkPorDefecto } from "../shell/types";

type Props = {
  titulo: ReactNode;
  secundario?: ReactNode;
  /** Tercera línea opcional (teléfono: "4 instalaciones"). */
  terciario?: ReactNode;
  /** Avatar, monograma o icono a la izquierda. */
  inicio?: ReactNode;
  /** Badge o dato a la derecha (antes del chevron). */
  fin?: ReactNode;
  seleccionada?: boolean;
  /** Fila como enlace (server-first) o como botón (`onClick`). */
  href?: string;
  Link?: LinkComponent;
  onClick?: () => void;
  sinChevron?: boolean;
  className?: string;
};

export const claseFila = (seleccionada?: boolean) =>
  cn(
    "relative flex min-h-16 w-full items-center gap-3 border-b border-border py-2.5 pr-3 pl-4 text-left text-fg outline-none transition-colors duration-150",
    "hover:bg-bg active:bg-fill focus-visible:rounded-md focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-focus",
    seleccionada &&
      "bg-accent-muted hover:bg-accent-muted before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-['']",
  );

/** Monograma cuadrado de 36 px para filas (cuentas, instalaciones). */
export function MonoAv({ texto, seleccionada }: { texto: ReactNode; seleccionada?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 flex-none items-center justify-center rounded-sm bg-fill text-xs font-semibold text-fg-muted",
        seleccionada && "bg-surface text-accent shadow-[inset_0_0_0_1px_var(--ds-accent)]",
      )}
    >
      {texto}
    </span>
  );
}

/**
 * Fila de lista tocable (56–72 px): inicio, título y línea secundaria, badge y chevron. Estados
 * hover, activo, foco por teclado y seleccionada (relleno de acento y barra de 3 px).
 */
export function FilaSeleccionable(props: Props) {
  const { titulo, secundario, terciario, inicio, fin, seleccionada, href, onClick } = props;
  const Link = props.Link ?? LinkPorDefecto;
  const contenido = (
    <>
      {inicio}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-base font-medium", seleccionada && "font-semibold")}>
          {titulo}
        </span>
        {secundario ? <span className="truncate text-sm text-fg-muted">{secundario}</span> : null}
        {terciario ? <span className="t-caption truncate">{terciario}</span> : null}
      </span>
      {fin ? <span className="flex flex-none flex-col items-end gap-1">{fin}</span> : null}
      {props.sinChevron ? null : (
        <ChevronRight
          aria-hidden
          className={cn("size-4 flex-none text-fg-subtle", seleccionada && "text-accent")}
        />
      )}
    </>
  );
  const clase = cn(claseFila(seleccionada), props.className);
  if (href)
    return (
      <Link href={href} className={clase} aria-current={seleccionada ? "page" : undefined}>
        {contenido}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={clase} aria-pressed={seleccionada}>
      {contenido}
    </button>
  );
}
