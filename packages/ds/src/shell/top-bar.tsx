"use client";

import { ChevronLeft, Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Avatar } from "../components/avatar";
import { Button } from "../components/button";
import type { ItemMenu } from "../components/menu";
import { AtajoBusqueda } from "../components/atajo-busqueda";
import { PortalSwitcher } from "./portal-switcher";
import {
  LinkPorDefecto,
  type LinkComponent,
  type Portal,
  type Tenant,
  type Usuario,
  type Volver,
} from "./types";
import { UserMenu } from "./user-menu";

export type ComunesBarra = {
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant;
  usuario?: Usuario;
  menuUsuario?: readonly ItemMenu[];
  empresas?: readonly ItemMenu[];
  /** Campana de notificaciones (isla de la app con `Popover`). */
  campana?: ReactNode;
  /** Abre la búsqueda global (⌘K). Sin ella, no hay búsqueda. */
  onBuscar?: () => void;
  volver?: Volver;
  /** El "Atrás" solo en teléfono (detalle dentro de una vista dividida en md+). */
  volverSoloTelefono?: boolean;
  Link?: LinkComponent;
};

/** Teléfono: selector de portal (o "‹ Atrás"), búsqueda y campana. 52 px + safe-area. */
export function TopBarTelefono(props: ComunesBarra & { acciones?: ReactNode }) {
  const { portales, portalActual, tenant, campana, onBuscar, volver, acciones } = props;
  const Link = props.Link ?? LinkPorDefecto;
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur md:hidden">
      <div className="flex h-[52px] items-center gap-1 pr-2 pl-2">
        {volver ? (
          <Link
            href={volver.href}
            className="flex min-h-11 min-w-0 items-center gap-1 rounded-md pr-2 text-md font-medium text-fg"
          >
            <ChevronLeft className="size-5 flex-none" aria-hidden />
            <span className="truncate">{volver.etiqueta}</span>
          </Link>
        ) : (
          <PortalSwitcher
            portales={portales}
            portalActual={portalActual}
            {...(tenant ? { tenant } : {})}
            {...(props.empresas ? { extra: props.empresas } : {})}
            className="min-w-0"
          />
        )}
        <div className={cn("ml-auto flex flex-none items-center gap-0.5", volver && acciones && "pr-2")}>
          {volver ? (
            acciones
          ) : (
            <>
              {onBuscar ? (
                <Button variant="ghost" size="icon" aria-label="Buscar" onClick={onBuscar}>
                  <Search className="size-5" />
                </Button>
              ) : null}
              {campana}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

type AppBarProps = ComunesBarra & {
  titulo: string;
  /** Insignia junto al título ("4 pendientes", "Superadmin"). */
  insignia?: ReactNode;
  acciones?: ReactNode;
};

/** iPad y desktop: título (o migas "‹ Cuentas / Logística Andina"), búsqueda ⌘K, campana, usuario y acción principal. 60 px. */
export function AppBar(props: AppBarProps) {
  const { titulo, insignia, acciones, usuario, menuUsuario, campana, onBuscar } = props;
  const volver = props.volverSoloTelefono ? undefined : props.volver;
  const Link = props.Link ?? LinkPorDefecto;
  return (
    <header className="sticky top-0 z-20 hidden h-[60px] flex-none items-center gap-3 border-b border-border bg-bg/95 px-6 backdrop-blur md:flex xl:px-8">
      {volver ? (
        <Link
          href={volver.href}
          className="-ml-2 flex size-11 flex-none items-center justify-center rounded-md text-fg hover:bg-fill"
          aria-label={`Volver a ${volver.etiqueta}`}
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {volver ? (
          <div className="min-w-0">
            <p className="t-caption truncate">{volver.etiqueta}</p>
            <h1 className="truncate text-md leading-6 font-semibold text-fg">{titulo}</h1>
          </div>
        ) : (
          <h1 className={cn("t-heading min-w-0 truncate text-fg", insignia && "flex-none")}>
            {titulo}
          </h1>
        )}
        {insignia}
      </div>
      {onBuscar ? (
        <>
          <button
            type="button"
            onClick={onBuscar}
            aria-label="Buscar o ir a"
            className="hidden h-9 w-64 items-center gap-2 rounded-md border border-border bg-surface pr-2 pl-3 text-base text-fg-subtle outline-none hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus xl:flex"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1 text-left">Buscar o ir a…</span>
            <AtajoBusqueda />
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Buscar"
            className="xl:hidden"
            onClick={onBuscar}
          >
            <Search className="size-5" />
          </Button>
        </>
      ) : null}
      {campana}
      {usuario && menuUsuario ? (
        <UserMenu usuario={usuario} items={menuUsuario} />
      ) : usuario ? (
        <Avatar nombre={usuario.nombre} />
      ) : null}
      {acciones ? <div className="flex flex-none items-center gap-2">{acciones}</div> : null}
    </header>
  );
}
