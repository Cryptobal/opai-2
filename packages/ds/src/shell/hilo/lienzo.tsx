import type { ReactNode } from "react";

import { cn } from "../../cn";
import type { LinkComponent, Volver } from "../types";
import { BTN_ICONO, PAD_CONTENIDO, PAD_LIENZO, SIN_BARRA } from "./estilos";
import { IconoHilo } from "./iconos";
import type { VistaHilo } from "./vista";

type Props = {
  titulo: string;
  sub?: string | undefined;
  insignia?: ReactNode;
  volver?: Volver | undefined;
  /** El «volver» de la página es solo para teléfono: desde 1024 px no se pinta. */
  volverSoloMovil?: boolean | undefined;
  inicioHref: string;
  vista: VistaHilo;
  /** Título del panel del marco abierto (Índice o Portales); con panel, la página queda oculta. */
  panel?: { titulo: string; sub: string; contenido: ReactNode } | undefined;
  onCerrarPanel: () => void;
  /** Teléfono, en Inicio: «volver» cierra el lienzo y deja el hilo a la vista. */
  onCerrarLienzo: () => void;
  acciones?: ReactNode;
  accionesTelefono?: ReactNode;
  completo?: boolean | undefined;
  Link: LinkComponent;
  className?: string;
  children: ReactNode;
};

const ATRAS = cn(BTN_ICONO, "-ml-2.5");

function Atras(p: Props) {
  const { Link } = p;
  const icono = <IconoHilo nombre="atras" />;
  if (p.panel)
    return (
      <button type="button" onClick={p.onCerrarPanel} aria-label={`Cerrar ${p.panel.titulo}`} className={ATRAS}>
        {icono}
      </button>
    );
  if (p.vista === "inicio")
    return (
      <button type="button" onClick={p.onCerrarLienzo} aria-label="Volver al hilo" className={cn(ATRAS, "lg:hidden")}>
        {icono}
      </button>
    );
  const soloMovil = !p.volver || p.volverSoloMovil;
  return (
    <Link
      href={p.volver?.href ?? p.inicioHref}
      aria-label={p.volver ? `Volver a ${p.volver.etiqueta}` : "Volver al hilo"}
      className={cn(ATRAS, soloMovil && "lg:hidden")}
      {...(p.volver ? {} : { onClick: p.onCerrarLienzo })}
    >
      {icono}
    </Link>
  );
}

/**
 * Lienzo: la pantalla de trabajo. Cabecera de 64 px con «volver», el área y el título —en todos los
 * anchos, como el diseño; en teléfono el patrón de la página oculta el suyo dentro de este marco— y el
 * contenido con su propio desplazamiento.
 */
export function LienzoHilo(p: Props) {
  return (
    <section
      aria-label={p.panel?.titulo ?? p.titulo}
      className={cn(
        "min-h-0 min-w-0 flex-col bg-bg [--fondo:var(--ds-bg)] lg:bg-surface lg:[--fondo:var(--ds-surface)]",
        p.className,
      )}
    >
      <header className={cn("flex min-h-16 flex-none items-center gap-1.5 border-b border-border", PAD_LIENZO)}>
        <Atras {...p} />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col">
            {(p.panel?.sub ?? p.sub) ? (
              <span className="truncate text-xs text-fg-muted">{p.panel?.sub ?? p.sub}</span>
            ) : null}
            <h1 className="truncate t-hilo-titulo text-fg">{p.panel?.titulo ?? p.titulo}</h1>
          </div>
          {p.panel ? null : p.insignia}
        </div>
        {p.panel ? null : (
          <>
            {p.acciones ? <div className="hidden flex-none items-center gap-2 md:flex">{p.acciones}</div> : null}
            {p.accionesTelefono ? (
              <div className="flex flex-none items-center gap-1 md:hidden">{p.accionesTelefono}</div>
            ) : null}
          </>
        )}
      </header>
      <main data-lienzo className={cn("min-h-0 flex-1 overflow-y-auto", SIN_BARRA)}>
        {p.panel ? (
          <div className={cn("flex flex-col gap-7", PAD_CONTENIDO)}>{p.panel.contenido}</div>
        ) : null}
        <div
          hidden={Boolean(p.panel)}
          className={cn(
            "w-full flex-col xl:pr-[calc(var(--lienzo-x)+var(--panel-lateral,0px))]",
            PAD_CONTENIDO,
            !p.panel && "flex",
            !p.completo && "max-w-[1280px]",
          )}
        >
          {p.children}
        </div>
      </main>
    </section>
  );
}
