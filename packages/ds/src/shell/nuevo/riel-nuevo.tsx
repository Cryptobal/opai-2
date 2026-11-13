"use client";

import type { ReactNode } from "react";

import { cn } from "../../cn";
import type { ItemMenu } from "../../components/menu";
import { iconoDeArea } from "../area-iconos";
import { Contador } from "../contador";
import { PortalSwitcher } from "../portal-switcher";
import { esActivo, type LinkComponent, type NavItem, type Portal, type Tenant } from "../types";

const claseItem = (activo: boolean) =>
  cn(
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-xs leading-3 font-medium outline-none focus-visible:outline-2 focus-visible:outline-focus",
    activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill",
  );

type Props = {
  items: readonly NavItem[];
  rutaActual: string;
  Link: LinkComponent;
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant | undefined;
  empresas?: readonly ItemMenu[] | undefined;
  boton?: ReactNode;
  /** Abre el menú completo sobre la página con esa área desplegada. */
  onArea: (area: string) => void;
};

/**
 * Riel del diseño nuevo con el menú plegado (ADR-109, CAR-377): solo lo de primer nivel (Inicio,
 * Bandeja…) y un ícono por área (Comercial, Operaciones…), nunca cada submódulo. Tocar un área abre
 * el menú completo con esa área desplegada; al pasar el mouse se asoma igual que antes.
 */
export function RielNuevo(p: Props) {
  const visibles = p.items.filter((i) => !i.pie && !i.soloAmplio);
  const sueltos = visibles.filter((i) => !i.area);
  const areas = [...new Map(visibles.filter((i) => i.area).map((i) => [i.area ?? "", i])).values()];
  const activo = (i: NavItem) => esActivo(p.rutaActual, i.href, i.exacta, i.activoEn);
  const enlace = (i: NavItem, conContador = true) => (
    <li key={i.href} className="w-full">
      <p.Link
        href={i.href}
        aria-current={activo(i) ? "page" : undefined}
        className={claseItem(activo(i))}
      >
        <span className="relative">
          <i.icono className={cn("size-5", activo(i) && "text-accent")} aria-hidden />
          {conContador ? <Contador n={i.alerta ? i.contador : undefined} /> : null}
        </span>
        <span lang="es" className="w-full hyphens-auto px-0.5 text-center text-[11px]">{i.corta ?? i.etiqueta}</span>
      </p.Link>
    </li>
  );
  return (
    <nav
      aria-label="Principal"
      data-shell="riel"
      data-riel-nuevo=""
      className="sticky top-0 hidden h-dvh w-20 flex-none flex-col items-center border-r border-border bg-surface py-4 md:flex lg:hidden"
    >
      {p.boton ? <span className="mb-2">{p.boton}</span> : null}
      <PortalSwitcher
        portales={p.portales}
        portalActual={p.portalActual}
        tenant={p.tenant}
        extra={p.empresas}
        variante="riel"
        className="mb-3 w-16"
      />
      <ul className="flex min-h-0 w-full flex-col gap-1 overflow-y-auto px-2 py-1">
        {sueltos.map((i) => enlace(i))}
        {areas.map((primero) => {
          const area = primero.area ?? "";
          const Icono = iconoDeArea(area);
          const dentro = visibles.some((i) => i.area === area && activo(i));
          return (
            <li key={area} className="w-full">
              <button
                type="button"
                onClick={() => p.onArea(area)}
                aria-haspopup="true"
                className={claseItem(dentro)}
              >
                <Icono className={cn("size-5", dentro && "text-accent")} aria-hidden />
                <span lang="es" className="w-full hyphens-auto px-0.5 text-center text-[11px]">{primero.grupo ?? area}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="mt-auto flex w-full flex-col gap-1 px-2">
        {p.items.filter((i) => i.pie).map((i) => enlace(i, false))}
      </ul>
    </nav>
  );
}
