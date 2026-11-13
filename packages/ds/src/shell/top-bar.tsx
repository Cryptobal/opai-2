"use client";

import { ChevronLeft, Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Button } from "../components/button";
import type { ItemMenu } from "../components/menu";
import { CajaBusqueda } from "./caja-busqueda";
import { PortalSwitcher } from "./portal-switcher";
import { AtrasBarra, MigasBarra } from "./volver-barra";
import {
  LinkPorDefecto,
  type LinkComponent,
  type Portal,
  type Tenant,
  type Usuario,
  type Volver,
} from "./types";
import { MenuUsuarioBarra } from "./user-menu";

export type ComunesBarra = {
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant;
  usuario?: Usuario;
  menuUsuario?: readonly ItemMenu[];
  empresas?: readonly ItemMenu[];
  /** Campana de notificaciones (isla de la app con `Popover`). */
  campana?: ReactNode;
  /**
   * Agente interno (ADR-049, D11): su icono va siempre a la izquierda de la campana. Sin agente
   * construido no se pasa y no aparece ningún botón vacío.
   */
  agente?: ReactNode;
  /** Abre la búsqueda global (⌘K). Sin ella, no hay búsqueda. */
  onBuscar?: () => void;
  /** Texto de la caja de búsqueda en desktop (el diseño nuevo, ADR-109, la abre también al agente). */
  textoBusqueda?: string;
  /** Botón de tema en la barra de iPad y desktop (diseño nuevo); en teléfono el tema vive en «Yo». */
  tema?: ReactNode;
  busquedaCompacta?: boolean;
  volver?: Volver;
  /** El "Atrás" solo en teléfono (detalle dentro de una vista dividida en md+). */
  volverSoloTelefono?: boolean;
  /** Con `volverSoloTelefono`: el "Atrás" sigue en la barra de 768 a 1023 px (ficha de un solo panel). */
  volverBajoLg?: boolean;
  Link?: LinkComponent;
};

/**
 * Teléfono (ShellPhone): selector de portal (o "‹ Atrás") a la izquierda y un grupo fijo a la derecha
 * con Buscar, la campana y el avatar del usuario (52 px + safe-area; ADR-050, reemplaza la D7). Si una
 * ficha trae acciones (menú ⋯), van a la izquierda del grupo fijo, que mantiene tamaño y posición
 * constantes entre vistas, también con "Atrás" (CAR-12).
 */
export function TopBarTelefono(props: ComunesBarra & { acciones?: ReactNode }) {
  const { portales, portalActual, tenant, campana, volver, acciones } = props;
  const Link = props.Link ?? LinkPorDefecto;
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur md:hidden">
      <div className="flex h-[52px] items-center gap-1 pr-2 pl-2">
        {volver ? (
          <Link
            href={volver.href}
            aria-label={`Volver a ${volver.etiqueta}`}
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
            className="min-w-0 flex-1"
          />
        )}
        <div className="ml-auto flex flex-none items-center gap-0.5">
          {volver && acciones ? (
            <div className="flex flex-none items-center gap-0.5 pr-1">{acciones}</div>
          ) : null}
          {props.onBuscar ? (
            <Button variant="ghost" size="icon" aria-label="Buscar" onClick={props.onBuscar}>
              <Search className="size-5" />
            </Button>
          ) : null}
          {props.agente}
          {campana}
          <MenuUsuarioBarra {...props} lado="abajo-derecha" />
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

/**
 * iPad y desktop: título (o migas "‹ Cuentas / Logística Andina") a la izquierda y un grupo fijo al
 * final con la caja de búsqueda ⌘K y la campana; el usuario va aquí en iPad y al pie de la barra
 * lateral en desktop (ShellTablet y ShellDesktop, ADR-050). 60 px. El grupo fijo mantiene tamaño y posición idénticos
 * entre vistas (CAR-12): la acción principal de la página vive en el patrón; si una ficha o un
 * formulario necesita acciones en la cabecera, van a la izquierda del grupo fijo, nunca a su derecha.
 */
export function AppBar(props: AppBarProps) {
  const { titulo, insignia, acciones, usuario, campana, onBuscar } = props;
  const bajoLg = Boolean(props.volverSoloTelefono && props.volverBajoLg);
  const volver = props.volverSoloTelefono && !bajoLg ? undefined : props.volver;
  const Link = props.Link ?? LinkPorDefecto;
  return (
    <header
      data-shell="barra"
      className="sticky top-0 z-20 hidden h-[60px] flex-none items-center gap-3 border-b border-border bg-bg/95 px-6 backdrop-blur md:flex xl:px-8"
    >
      {volver ? <AtrasBarra volver={volver} bajoLg={bajoLg} Link={Link} /> : null}
      <div data-shell="titulo" className="flex min-w-0 flex-1 items-center gap-3">
        {volver ? (
          <MigasBarra volver={volver} titulo={titulo} bajoLg={bajoLg} />
        ) : (
          <h1 className={cn("t-heading min-w-0 truncate text-fg", insignia && "flex-none")}>
            {titulo}
          </h1>
        )}
        {insignia}
      </div>
      {acciones ? (
        <div data-shell="acciones" className="flex flex-none items-center gap-2">
          {acciones}
        </div>
      ) : null}
      {onBuscar ? (
        <CajaBusqueda
          onBuscar={onBuscar}
          compacta={props.busquedaCompacta}
          texto={props.textoBusqueda}
        />
      ) : null}
      <div data-shell="grupo" className="flex flex-none items-center gap-3">
        {props.tema}
        {props.agente}
        {campana}
        {usuario ? (
          <div className="lg:hidden">
            <MenuUsuarioBarra {...props} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
