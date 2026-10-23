import { cn } from "../cn";
import { PortalSwitcher } from "./portal-switcher";
import {
  esActivo,
  LinkPorDefecto,
  type LinkComponent,
  type NavItem,
  type Portal,
  type Tenant,
} from "./types";

type NavProps = { items: readonly NavItem[]; rutaActual: string; Link?: LinkComponent };

/** Teléfono: barra inferior de hasta 5 ítems, 56px + safe-area. Activo: texto fg e icono acento. */
export function BottomNav({ items, rutaActual, Link = LinkPorDefecto }: NavProps) {
  const visibles = items.slice(0, 5);
  return (
    <nav
      aria-label="Principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden"
    >
      <ul
        className="grid px-1"
        style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}
      >
        {visibles.map((item) => {
          const activo = esActivo(rutaActual, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] leading-[14px] font-medium tracking-[0.01em]",
                  activo ? "text-fg" : "text-fg-subtle",
                )}
              >
                <item.icono className={cn("size-5", activo && "text-accent")} aria-hidden />
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export type RailProps = NavProps & {
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant;
};

/** iPad: riel de 80px con selector de portal arriba e ítems de 64×56. */
export function Rail({
  items,
  rutaActual,
  Link = LinkPorDefecto,
  portales,
  portalActual,
  tenant,
}: RailProps) {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-20 flex-none flex-col items-center gap-1 border-r border-border bg-surface py-3 md:flex xl:hidden"
    >
      <PortalSwitcher
        portales={portales}
        portalActual={portalActual}
        {...(tenant ? { tenant } : {})}
        variante="riel"
        className="mb-2"
      />
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const activo = esActivo(rutaActual, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-md text-[11px] leading-[14px] font-medium",
                  activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill",
                )}
              >
                <item.icono className={cn("size-5", activo && "text-accent")} aria-hidden />
                <span className="truncate">{item.etiqueta}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
