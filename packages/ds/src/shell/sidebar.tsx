"use client";

import { lazy, Suspense, useState } from "react";

import type { ItemMenu } from "../components/menu";
import type { ItemFijado } from "./fijados";
import { PortalSwitcher } from "./portal-switcher";
import { SidebarAreas } from "./sidebar-areas";
import { agrupar, Item, Pie } from "./sidebar-item";
import {
  esActivo,
  LinkPorDefecto,
  type LinkComponent,
  type NavItem,
  type Portal,
  type Tenant,
  type Usuario,
} from "./types";

const Fijados = lazy(() => import("./fijados").then((m) => ({ default: m.Fijados })));

type SidebarProps = {
  items: readonly NavItem[];
  rutaActual: string;
  Link?: LinkComponent | undefined;
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant | undefined;
  empresas?: readonly ItemMenu[] | undefined;
  usuario?: Usuario | undefined;
  menuUsuario?: readonly ItemMenu[] | undefined;
  fijados?: readonly ItemFijado[] | undefined;
  errorFijados?: boolean | undefined;
  reintentarFijados?: (() => void) | undefined;
  onFijar?: ((item: NavItem) => void) | undefined;
  onDesfijar?: ((href: string) => void) | undefined;
  areaAbierta?: string | null | undefined;
  onAreaAbierta?: ((area: string) => void) | undefined;
};

/** Desktop (ShellDesktop): fijados, portal, acordeón por área (D1) y usuario al pie. */
export function Sidebar(props: SidebarProps) {
  const { items, rutaActual, Link = LinkPorDefecto } = props;
  const grupos = agrupar(items.filter((i) => !i.pie));
  const grupoActivo = grupos.find(([, lista]) =>
    lista.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn)),
  );
  const [abiertoLocal, setAbiertoLocal] = useState<string | null>(
    grupoActivo?.[1][0]?.area ?? grupoActivo?.[0] ?? null,
  );
  const abierto = props.areaAbierta !== undefined ? props.areaAbierta : abiertoLocal;
  const fijadosHrefs = new Set((props.fijados ?? []).map((f) => f.href));
  const alternar = (grupo: string, area: string | undefined) => {
    const clave = area ?? grupo;
    if (props.onAreaAbierta) props.onAreaAbierta(clave);
    else setAbiertoLocal((a) => (a === clave ? null : clave));
  };
  const pinDe = (item: NavItem) =>
    item.fijable && props.onFijar
      ? { onFijar: () => props.onFijar?.(item), fijado: fijadosHrefs.has(item.href) }
      : {};
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-border bg-surface lg:flex"
    >
      <div className="flex flex-none flex-col gap-3 px-3 pt-3.5 pb-1">
        <span className="flex items-center justify-between px-2">
          <span className="text-[17px] leading-6 font-bold tracking-[-0.02em] text-fg">OPAI</span>
          <span className="t-caption">2.0</span>
        </span>
        <PortalSwitcher
          portales={props.portales}
          portalActual={props.portalActual}
          {...(props.tenant ? { tenant: props.tenant } : {})}
          {...(props.empresas ? { extra: props.empresas } : {})}
          variante="tarjeta"
          className="w-full"
        />
      </div>
      {props.fijados ? (
        <Suspense fallback={null}>
          <Fijados
            items={props.fijados}
            rutaActual={rutaActual}
            onDesfijar={props.onDesfijar ?? (() => undefined)}
            {...(props.errorFijados ? { error: true } : {})}
            {...(props.reintentarFijados ? { reintentar: props.reintentarFijados } : {})}
            Link={Link}
          />
        </Suspense>
      ) : null}
      <SidebarAreas
        items={items}
        rutaActual={rutaActual}
        Link={Link}
        abierto={abierto}
        alternar={alternar}
        pinDe={pinDe}
      />
      <div className="flex flex-col gap-px px-3 py-2">
        {items
          .filter((i) => i.pie)
          .map((item) => (
            <Item key={item.href} item={item} rutaActual={rutaActual} Link={Link} />
          ))}
      </div>
      {props.usuario ? <Pie usuario={props.usuario} menu={props.menuUsuario} /> : null}
    </nav>
  );
}
