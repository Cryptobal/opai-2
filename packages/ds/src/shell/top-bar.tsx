import { Bell, Search } from "lucide-react";

import { cn } from "../cn";
import { Avatar } from "../components/avatar";
import { Button } from "../components/button";
import { PortalSwitcher } from "./portal-switcher";
import type { Portal, Tenant, Usuario } from "./types";

type Comunes = {
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant;
  usuario?: Usuario;
  notificaciones?: number;
};

function Campana({ n }: { n?: number }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={n ? `${n} notificaciones` : "Notificaciones"}
      className="relative"
    >
      <Bell className="size-5" />
      {n ? (
        <span className="t-numeric absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 text-[11px] leading-none font-semibold text-white shadow-[0_0_0_2px_var(--ds-surface)] dark:bg-danger dark:text-inverse-fg">
          {n}
        </span>
      ) : null}
    </Button>
  );
}

/** Teléfono: selector de portal a la izquierda; búsqueda, campana y avatar a la derecha. 52px + safe-area. */
export function TopBarTelefono({
  portales,
  portalActual,
  tenant,
  usuario,
  notificaciones,
}: Comunes) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur md:hidden">
      <div className="flex h-[52px] items-center gap-1 pr-2 pl-3">
        <PortalSwitcher
          portales={portales}
          portalActual={portalActual}
          {...(tenant ? { tenant } : {})}
        />
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" aria-label="Buscar">
            <Search className="size-5" />
          </Button>
          <Campana {...(notificaciones ? { n: notificaciones } : {})} />
          {usuario ? <Avatar nombre={usuario.nombre} className="ml-1" /> : null}
        </div>
      </div>
    </header>
  );
}

type AppBarProps = Comunes & { titulo: string };

/** iPad y desktop: título de la página, búsqueda global, campana y usuario. 60px. */
export function AppBar({ titulo, usuario, notificaciones }: AppBarProps) {
  return (
    <header className="sticky top-0 z-20 hidden h-[60px] items-center gap-3 border-b border-border bg-bg/95 px-6 backdrop-blur md:flex xl:px-8">
      <h1 className="t-heading min-w-0 flex-1 truncate text-fg">{titulo}</h1>
      <button
        type="button"
        aria-label="Buscar (⌘K)"
        className={cn(
          "hidden h-9 w-64 items-center gap-2 rounded-md border border-border bg-surface pr-2 pl-3 text-base text-fg-subtle lg:flex",
        )}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="rounded-sm border border-border bg-bg px-1.5 text-xs font-medium text-fg-subtle">
          ⌘K
        </kbd>
      </button>
      <Button variant="ghost" size="icon" aria-label="Buscar" className="lg:hidden">
        <Search className="size-5" />
      </Button>
      <Campana {...(notificaciones ? { n: notificaciones } : {})} />
      {usuario ? <Avatar nombre={usuario.nombre} className="xl:hidden" /> : null}
    </header>
  );
}
