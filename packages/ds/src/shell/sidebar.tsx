"use client";

import { lazy, Suspense } from "react";

import type { ItemMenu } from "../components/menu";
import type { ItemFijado } from "./fijados";
import { PortalSwitcher } from "./portal-switcher";
import { agrupar, Item, Pie } from "./sidebar-item";
import {
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
  /** Cambiar de empresa (ítems del menú del selector de portal). */
  empresas?: readonly ItemMenu[] | undefined;
  /** Usuario al pie de la barra (ShellDesktop): con `menuUsuario`, abre su menú hacia arriba. */
  usuario?: Usuario | undefined;
  menuUsuario?: readonly ItemMenu[] | undefined;
  /** Fijados (D3): sin esta prop, la sección no se muestra (portales sin fijados todavía). */
  fijados?: readonly ItemFijado[] | undefined;
  errorFijados?: boolean | undefined;
  reintentarFijados?: (() => void) | undefined;
  onFijar?: ((item: NavItem) => void) | undefined;
  onDesfijar?: ((href: string) => void) | undefined;
  /** Acordeón por área (D1): área abierta controlada por quien use `Sidebar`. Sin esta prop, cada
   *  `Sidebar` recuerda su propia área activa al montar (portales sin preferencia persistida). */
  areaAbierta?: string | null | undefined;
  onAreaAbierta?: ((area: string) => void) | undefined;
};

/**
 * Desktop (ShellDesktop): fijados, la marca, el selector de portal y empresa en tarjeta, las áreas
 * en acordeón (D1), Configuración y el usuario al pie. Las áreas de una sola entrada visible van
 * sueltas, sin encabezado (R3, ya resuelto por quien arma la navegación).
 */
export function Sidebar(props: SidebarProps) {
  const { items, rutaActual, Link = LinkPorDefecto } = props;
  const grupos = agrupar(items.filter((i) => !i.pie));
  const fijadosHrefs = new Set((props.fijados ?? []).map((f) => f.href));
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
      <div className="flex-1 overflow-y-auto pt-2 pb-6">
        {grupos
          .filter((i) => !i[1].some((x) => x.soloCompacto))
          .map(([grupo, lista]) => {
            if (!grupo) {
              return (
                <div key="suelto" className="flex flex-col gap-px px-3">
                  {lista.map((item) => (
                    <Item
                      key={item.href}
                      item={item}
                      rutaActual={rutaActual}
                      Link={Link}
                      {...pinDe(item)}
                    />
                  ))}
                </div>
              );
            }
            return (
              <section key={grupo} className="mt-3 px-3" aria-label={grupo}>
                <h2 className="t-overline px-2 py-2 text-fg-muted">{grupo}</h2>
                {lista.map((item) => (
                  <Item
                    key={item.href}
                    item={item}
                    rutaActual={rutaActual}
                    Link={Link}
                    {...pinDe(item)}
                  />
                ))}
              </section>
            );
          })}
      </div>
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
