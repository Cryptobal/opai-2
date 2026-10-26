import { cn } from "../cn";
import type { ItemMenu } from "../components/menu";
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
  const activo = esActivo(rutaActual, item.href);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={activo ? "page" : undefined}
        {...(item.corta && item.corta !== item.etiqueta
          ? { title: item.etiqueta, "aria-label": item.etiqueta }
          : {})}
        className={cn(
          "flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-md text-[11px] leading-[14px] font-medium",
          activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill",
        )}
      >
        <span className="relative">
          <item.icono className={cn("size-5", activo && "text-accent")} aria-hidden />
          {sinContador ? null : <Contador n={item.alerta ? item.contador : undefined} />}
        </span>
        <span className="max-w-full truncate">{item.corta ?? item.etiqueta}</span>
      </Link>
    </li>
  );
}

export type RailProps = NavProps & {
  /** Selector de portal y de empresa bajo la marca (iPad, 768–1279 px). */
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant | undefined;
  /** Cambiar de empresa (ítems del menú del selector). */
  empresas?: readonly ItemMenu[] | undefined;
};

/**
 * iPad (ShellTablet.html): riel de 80 px con el selector de portal y empresa arriba, sin marca, ítems de 64×56 y los
 * ítems fijos (Configuración) al pie.
 */
export function Rail({
  items,
  rutaActual,
  Link = LinkPorDefecto,
  portales,
  portalActual,
  tenant,
  empresas,
}: RailProps) {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-20 flex-none flex-col items-center border-r border-border bg-surface py-3 md:flex xl:hidden"
    >
      <PortalSwitcher
        portales={portales}
        portalActual={portalActual}
        tenant={tenant}
        extra={empresas}
        variante="riel"
        className="mb-3 w-16"
      />
      <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto px-1 py-1">
        {items
          .filter((i) => !i.pie && !i.soloAmplio)
          .map((item) => (
            <ItemRiel key={item.href} item={item} rutaActual={rutaActual} Link={Link} />
          ))}
      </ul>
      <ul className="mt-auto flex flex-col gap-1">
        {items
          .filter((i) => i.pie)
          .map((item) => (
            <ItemRiel key={item.href} item={item} sinContador rutaActual={rutaActual} Link={Link} />
          ))}
      </ul>
    </nav>
  );
}
