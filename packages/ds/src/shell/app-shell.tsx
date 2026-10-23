import type { ReactNode } from "react";

import type { ItemMenu } from "../components/menu";

import { cn } from "../cn";
import { BottomNav, Rail } from "./nav";
import { Sidebar } from "./sidebar";
import { AppBar, TopBarTelefono } from "./top-bar";
import type { LinkComponent, NavItem, Portal, Tenant, Usuario } from "./types";

export type AppShellProps = {
  /** Título de la página: va en la barra superior de iPad y desktop. En teléfono lo muestra el patrón
   *  (que recibe el mismo título y lo oculta en md+). */
  titulo: string;
  nav: readonly NavItem[];
  portales: readonly Portal[];
  portalActual: string;
  rutaActual: string;
  tenant?: Tenant;
  usuario?: Usuario;
  /** Ítems del menú de usuario (empresas, perfil, cerrar sesión). Sin ítems, solo avatar. */
  menuUsuario?: readonly ItemMenu[];
  notificaciones?: number;
  Link?: LinkComponent;
  children: ReactNode;
  className?: string;
};

/**
 * Shell de OPAI 2.0 (ADR-007, diseño aprobado): barra superior con selector de portal y navegación
 * inferior en teléfono; riel en iPad; barra lateral en desktop. Desktop es el mismo diseño con más espacio.
 */
export function AppShell(props: AppShellProps) {
  const {
    titulo,
    nav,
    portales,
    portalActual,
    rutaActual,
    tenant,
    usuario,
    menuUsuario,
    notificaciones,
    Link,
    children,
    className,
  } = props;
  const comunes = {
    portales,
    portalActual,
    ...(tenant ? { tenant } : {}),
    ...(usuario ? { usuario } : {}),
    ...(menuUsuario ? { menuUsuario } : {}),
    ...(notificaciones ? { notificaciones } : {}),
  };
  const linkProps = Link ? { Link } : {};
  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <Rail
        items={nav}
        rutaActual={rutaActual}
        portales={portales}
        portalActual={portalActual}
        {...(tenant ? { tenant } : {})}
        {...linkProps}
      />
      <Sidebar items={nav} rutaActual={rutaActual} {...comunes} {...linkProps} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBarTelefono {...comunes} />
        <AppBar titulo={titulo} {...comunes} />
        <main
          className={cn(
            "mx-auto w-full max-w-[1280px] flex-1 px-4 pt-1 pb-[calc(56px+16px+env(safe-area-inset-bottom))] md:px-6 md:pt-5 md:pb-8 xl:px-8",
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
