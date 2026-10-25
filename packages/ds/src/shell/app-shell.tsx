import type { ReactNode } from "react";

import { cn } from "../cn";
import { BottomNav } from "./nav";
import { Rail } from "./rail";
import { Sidebar } from "./sidebar";
import { AppBar, type ComunesBarra, TopBarTelefono } from "./top-bar";
import type { NavItem } from "./types";

export type AppShellProps = ComunesBarra & {
  /** Título de la página: va en la barra superior de iPad y desktop. En teléfono lo muestra el patrón
   *  (que recibe el mismo título y lo oculta en md+). */
  titulo: string;
  nav: readonly NavItem[];
  rutaActual: string;
  /** Acción principal de la página en la barra superior (md+); en teléfono va en el patrón. */
  acciones?: ReactNode;
  /** Acciones en la barra del teléfono cuando hay "Atrás" (menú ⋯ del detalle). */
  accionesTelefono?: ReactNode;
  insignia?: ReactNode;
  /** Subtítulo bajo la marca, en el riel de iPad y en la barra lateral de desktop ("Plataforma"). */
  subtituloMarca?: string;
  onNavegar?: (href: string) => void;
  /** Contenido a alto completo (vistas divididas): sin márgenes del contenedor en md+. */
  completo?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Shell de OPAI 2.0 (ADR-007, diseño aprobado): barra superior con selector de portal y navegación
 * inferior en teléfono; riel en iPad; barra lateral en desktop. Configuración, fija al pie.
 */
export function AppShell(props: AppShellProps) {
  const { titulo, nav, rutaActual, acciones, insignia, children, className, Link } = props;
  const { accionesTelefono, subtituloMarca, onNavegar, completo, ...barra } = props;
  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <Rail
        items={nav}
        rutaActual={rutaActual}
        portales={props.portales}
        portalActual={props.portalActual}
        tenant={props.tenant}
        empresas={props.empresas}
        Link={Link}
      />
      <Sidebar
        items={nav}
        rutaActual={rutaActual}
        portales={props.portales}
        portalActual={props.portalActual}
        tenant={props.tenant}
        empresas={props.empresas}
        subtitulo={subtituloMarca}
        Link={Link}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBarTelefono {...barra} acciones={accionesTelefono ?? null} />
        <AppBar
          {...barra}
          titulo={titulo}
          {...(insignia ? { insignia } : {})}
          {...(acciones ? { acciones } : {})}
        />
        <main
          className={cn(
            "mx-auto flex w-full flex-1 flex-col px-4 pt-1 pb-[calc(56px+16px+env(safe-area-inset-bottom))] md:px-6 md:pt-5 md:pb-8 xl:px-8",
            !completo && "max-w-[1280px]",
            className,
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav
        items={nav}
        rutaActual={rutaActual}
        {...(props.menuUsuario ? { extras: props.menuUsuario } : {})}
        {...(onNavegar ? { onNavegar } : {})}
        Link={Link}
      />
    </div>
  );
}
