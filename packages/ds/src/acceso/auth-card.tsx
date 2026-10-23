import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { LinkPorDefecto, type LinkComponent } from "../shell/types";

export type AuthCardProps = {
  /** Sufijo del wordmark en portales ("Trabajador", "Cliente"). */
  sufijo?: string;
  /** Enlace "volver" (chevron) en lugar del wordmark. */
  volver?: string;
  titulo?: string;
  subtitulo?: ReactNode;
  /** Sobre el título: monograma del tenant (invitación). */
  insignia?: ReactNode;
  /** Botones: fijos abajo en teléfono; al final de la tarjeta en md+. */
  acciones?: ReactNode;
  /** Enlaces bajo la tarjeta (portales alternativos). */
  pie?: ReactNode;
  /** Selector de empresa: en md+ sin tarjeta, encabezado centrado y 440px de ancho. */
  abierta?: boolean;
  Link?: LinkComponent;
  children?: ReactNode;
};

function Wordmark({ sufijo, className }: { sufijo?: string | undefined; className?: string }) {
  return (
    <p className={cn("text-[17px] leading-6 font-bold tracking-[-0.02em] text-fg", className)}>
      OPAI{sufijo ? <span className="ml-1.5 font-medium text-fg-muted">{sufijo}</span> : null}
    </p>
  );
}

/**
 * Pantalla de acceso (diseño aprobado, export-acceso): en teléfono ocupa la pantalla con gutters
 * de 16 y acciones abajo; en md+ es una tarjeta de 400px centrada sobre `bg` con el wordmark arriba.
 */
export function AuthCard(props: AuthCardProps) {
  const {
    sufijo,
    volver,
    titulo,
    subtitulo,
    insignia,
    acciones,
    pie,
    abierta,
    Link = LinkPorDefecto,
    children,
  } = props;
  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col bg-bg px-4 md:items-center md:justify-center md:py-10">
      <div
        className={cn(
          "flex w-full flex-1 flex-col pt-6 md:flex-none md:pt-0",
          abierta ? "md:max-w-[440px]" : "md:max-w-[400px]",
        )}
      >
        <div className="flex h-11 items-center md:mb-6 md:justify-center">
          {volver ? (
            <Link
              href={volver}
              className="-ml-2 flex size-11 items-center justify-center rounded-md text-fg hover:bg-fill md:hidden"
            >
              <ChevronLeft className="size-5" aria-label="Volver" />
            </Link>
          ) : (
            <Wordmark sufijo={sufijo} className="md:hidden" />
          )}
          <Wordmark sufijo={sufijo} className="hidden md:block" />
        </div>
        <div
          className={cn(
            "flex flex-1 flex-col pt-8 md:flex-none md:pt-0",
            !abierta && "md:rounded-lg md:border md:border-border md:bg-surface md:p-6",
          )}
        >
          {titulo ? (
            <header className={cn("mb-6", abierta && "md:text-center")}>
              {insignia ? <div className="mb-4">{insignia}</div> : null}
              <h1 className="t-title text-fg md:t-heading">{titulo}</h1>
              {subtitulo ? (
                <div className="mt-1 text-md text-fg-muted md:text-base">{subtitulo}</div>
              ) : null}
            </header>
          ) : null}
          <div className="flex flex-col gap-4">{children}</div>
          {acciones ? (
            <div className="mt-auto flex flex-col gap-2 pt-8 pb-4 md:mt-6 md:pt-0 md:pb-0">
              {acciones}
            </div>
          ) : null}
        </div>
        {pie ? <div className="flex justify-center gap-2 py-6 text-sm md:pb-0">{pie}</div> : null}
      </div>
    </main>
  );
}

/** Separador con texto ("o") entre el login con contraseña y los proveedores. */
export function Separador({ texto = "o" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-fg-subtle" role="separator">
      <span className="h-px flex-1 bg-border" />
      {texto}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
