import { cn } from "../cn";
import { esActivo, type LinkComponent, type NavItem } from "./types";

const LinkPorDefecto: LinkComponent = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

type NavProps = { items: readonly NavItem[]; rutaActual: string; Link?: LinkComponent };

/** Navegación inferior en teléfono: hasta 5 ítems con etiqueta, ≥44px, safe-area. */
export function BottomNav({ items, rutaActual, Link = LinkPorDefecto }: NavProps) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {items.slice(0, 5).map((item) => {
          const activo = esActivo(rutaActual, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
                  activo ? "text-fg font-medium" : "text-fg-muted",
                )}
              >
                <item.icono className="size-5" aria-hidden />
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Riel compacto en iPad (md), barra lateral expandida en desktop (xl). */
export function SideNav({ items, rutaActual, Link = LinkPorDefecto }: NavProps) {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 border-r border-border bg-surface md:block md:w-[72px] xl:w-64"
    >
      <ul className="flex flex-col gap-1 p-2">
        {items.map((item) => {
          const activo = esActivo(rutaActual, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-base",
                  activo ? "bg-accent-muted text-fg font-medium" : "text-fg-muted hover:bg-bg hover:text-fg",
                )}
              >
                <item.icono className="size-5" aria-hidden />
                <span className="truncate">{item.etiqueta}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
