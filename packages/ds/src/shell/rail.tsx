import { cn } from "../cn";
import { Menu as IconoMenu, PanelLeftOpen } from "lucide-react";
import type { ItemMenu } from "../components/menu";
import type { ItemFijado } from "./fijados";
import { MenuMas } from "./menu-mas";
import { Contador } from "./contador";
import type { NavProps } from "./nav";
import { PortalSwitcher } from "./portal-switcher";
import {
  esActivo,
  LinkPorDefecto,
  type LinkComponent,
  type NavItem,
  type Portal,
  type Tenant,
} from "./types";

function ItemRiel({
  item,
  rutaActual,
  Link,
  sinContador,
}: {
  item: NavItem;
  rutaActual: string;
  Link: LinkComponent;
  sinContador?: boolean;
}) {
  const activo = esActivo(rutaActual, item.href, item.exacta, item.activoEn);
  return (
    <li className="w-full">
      <Link
        href={item.href}
        aria-current={activo ? "page" : undefined}
        {...(item.corta && item.corta !== item.etiqueta
          ? { title: item.etiqueta, "aria-label": item.etiqueta }
          : {})}
        className={cn(
          "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-xs leading-3 font-medium",
          activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill",
        )}
      >
        <span className="relative">
          <item.icono className={cn("size-5", activo && "text-accent")} aria-hidden />
          {sinContador ? null : <Contador n={item.alerta ? item.contador : undefined} />}
        </span>
        <span lang="es" className="w-full hyphens-auto wrap-normal text-center">
          {item.corta ?? item.etiqueta}
        </span>
      </Link>
    </li>
  );
}

export type RailProps = NavProps & {
  /** Selector de portal y de empresa arriba del riel (iPad, 768–1023 px). */
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant | undefined;
  /** Cambiar de empresa (ítems del menú del selector). */
  empresas?: readonly ItemMenu[] | undefined;
  fijados?: readonly ItemFijado[];
  errorFijados?: boolean;
  reintentarFijados?: () => void;
  onDesfijar?: (href: string) => void;
  onNavegar?: (href: string) => void;
  /** Diseño nuevo (ADR-109): con el menú plegado el riel también se ve en escritorio, se asoma el
   *  menú completo al pasar el mouse y arriba hay un botón para dejarlo fijo. */
  plegable?: PlegableRiel | undefined;
};

export type PlegableRiel = { plegado: boolean; onAsomar: () => void; onFijar: () => void };

/**
 * iPad vertical (ShellTablet, 768–1023 px, D9 del Brief 05): riel de 80 px con el selector de
 * portal y empresa arriba (sin la marca), ítems de 80×56 y los ítems fijos (Configuración) al pie.
 * Desde 1024 px se usa la barra lateral completa (`Sidebar`), sin un riel nuevo.
 */
export function Rail({
  items,
  rutaActual,
  Link = LinkPorDefecto,
  portales,
  portalActual,
  tenant,
  empresas,
  fijados,
  errorFijados,
  reintentarFijados,
  onDesfijar,
  onNavegar,
  plegable,
}: RailProps) {
  return (
    <nav
      aria-label="Principal"
      onPointerEnter={
        plegable ? (e) => e.pointerType === "mouse" && plegable.onAsomar() : undefined
      }
      className={cn(
        "sticky top-0 hidden h-dvh w-20 flex-none flex-col items-center border-r border-border bg-surface py-4 md:flex",
        !plegable?.plegado && "lg:hidden",
      )}
    >
      {plegable?.plegado ? (
        <button
          type="button"
          onClick={plegable.onFijar}
          aria-label="Dejar el menú fijo"
          title="Dejar el menú fijo"
          className="mb-2 hidden size-9 items-center justify-center rounded-md text-fg-muted hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus lg:flex"
        >
          <PanelLeftOpen className="size-[18px]" aria-hidden />
        </button>
      ) : null}
      <PortalSwitcher
        portales={portales}
        portalActual={portalActual}
        tenant={tenant}
        extra={empresas}
        variante="riel"
        className="mb-3 w-16"
      />
      <ul className="flex w-full min-h-0 flex-col gap-1 overflow-y-auto py-1">
        {items
          .filter((i) => !i.pie && !i.soloAmplio)
          .map((item) => (
            <ItemRiel key={item.href} item={item} rutaActual={rutaActual} Link={Link} />
          ))}
      </ul>
      <ul className="mt-auto flex w-full flex-col gap-1">
        {fijados ? (
          <li className="w-16">
            <MenuMas
              items={items}
              extras={[]}
              rutaActual={rutaActual}
              fijados={fijados}
              {...(errorFijados ? { errorFijados } : {})}
              {...(reintentarFijados ? { reintentarFijados } : {})}
              {...(onDesfijar ? { onDesfijar } : {})}
              {...(onNavegar ? { onNavegar } : {})}
              disparador={
                <span className="flex flex-col items-center text-[11px]">
                  <IconoMenu className="size-5" />
                  Más
                </span>
              }
            />
          </li>
        ) : null}
        {items
          .filter((i) => i.pie)
          .map((item) => (
            <ItemRiel key={item.href} item={item} sinContador rutaActual={rutaActual} Link={Link} />
          ))}
      </ul>
    </nav>
  );
}
