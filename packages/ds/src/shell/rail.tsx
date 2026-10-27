import { cn } from "../cn";
import { Menu as IconoMenu } from "lucide-react";
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
  /** Selector de portal y de empresa arriba del riel (iPad, 768–1279 px). */
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
};

/**
 * iPad vertical (ShellTablet, 768–1023 px, D9 del Brief 05): riel de 80 px con el selector de
 * portal y empresa arriba (sin la marca), ítems de 64×56 y los ítems fijos (Configuración) al pie.
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
  fijados, errorFijados, reintentarFijados, onDesfijar, onNavegar,
}: RailProps) {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-20 flex-none flex-col items-center border-r border-border bg-surface py-4 md:flex lg:hidden"
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
        {fijados ? <li className="w-16"><MenuMas items={items} extras={[]} rutaActual={rutaActual} fijados={fijados} {...(errorFijados ? { errorFijados } : {})} {...(reintentarFijados ? { reintentarFijados } : {})} {...(onDesfijar ? { onDesfijar } : {})} {...(onNavegar ? { onNavegar } : {})} disparador={<span className="flex flex-col items-center text-[11px]"><IconoMenu className="size-5" />Más</span>} /></li> : null}
        {items
          .filter((i) => i.pie)
          .map((item) => (
            <ItemRiel key={item.href} item={item} sinContador rutaActual={rutaActual} Link={Link} />
          ))}
      </ul>
    </nav>
  );
}
