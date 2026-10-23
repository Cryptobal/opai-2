import type { ReactNode } from "react";

import { cn } from "../cn";
import { BottomNav, SideNav } from "./nav";
import { TopBar } from "./top-bar";
import type { LinkComponent, NavItem, Portal } from "./types";

export type AppShellProps = {
  titulo: string;
  nav: readonly NavItem[];
  portales: readonly Portal[];
  portalActual: string;
  rutaActual: string;
  usuario?: { nombre: string; iniciales: string };
  accionesTopBar?: ReactNode;
  Link?: LinkComponent;
  children: ReactNode;
  className?: string;
};

/**
 * Shell de OPAI 2.0 (ADR-007): barra superior, navegación inferior en teléfono,
 * riel en iPad, barra lateral en desktop. Desktop es el mismo diseño con más espacio.
 */
export function AppShell({
  titulo,
  nav,
  portales,
  portalActual,
  rutaActual,
  usuario,
  accionesTopBar,
  Link,
  children,
  className,
}: AppShellProps) {
  const linkProps = Link ? { Link } : {};
  return (
    <div className="min-h-dvh bg-bg text-fg antialiased">
      <TopBar
        titulo={titulo}
        portales={portales}
        portalActual={portalActual}
        {...(usuario ? { usuario } : {})}
        {...(accionesTopBar ? { acciones: accionesTopBar } : {})}
      />
      <div className="mx-auto flex w-full max-w-[1280px]">
        <SideNav items={nav} rutaActual={rutaActual} {...linkProps} />
        <main
          className={cn(
            "min-w-0 flex-1 px-4 py-4 pb-[calc(4rem+16px+env(safe-area-inset-bottom))] md:px-6 md:pb-8 xl:px-8",
            className,
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav items={nav} rutaActual={rutaActual} {...linkProps} />
    </div>
  );
}
