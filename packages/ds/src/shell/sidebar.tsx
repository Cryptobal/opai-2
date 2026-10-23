import { cn } from "../cn";
import { Avatar } from "../components/avatar";
import { type RailProps } from "./nav";
import { PortalSwitcher } from "./portal-switcher";
import { esActivo, LinkPorDefecto, type NavItem, type Usuario } from "./types";

type SidebarProps = RailProps & { usuario?: Usuario };

function agrupar(items: readonly NavItem[]): [string, NavItem[]][] {
  const grupos = new Map<string, NavItem[]>();
  for (const item of items) {
    const g = item.grupo ?? "";
    grupos.set(g, [...(grupos.get(g) ?? []), item]);
  }
  return [...grupos.entries()];
}

/** Desktop: barra lateral de 248px con marca, selector de portal, grupos de navegación y usuario. */
export function Sidebar({
  items,
  rutaActual,
  Link = LinkPorDefecto,
  portales,
  portalActual,
  tenant,
  usuario,
}: SidebarProps) {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-border bg-surface xl:flex"
    >
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <span className="text-[17px] leading-6 font-bold tracking-[-0.02em] text-fg">OPAI</span>
        <span className="t-caption">2.0</span>
      </div>
      <div className="px-3 pb-2">
        <PortalSwitcher
          portales={portales}
          portalActual={portalActual}
          {...(tenant ? { tenant } : {})}
          variante="tarjeta"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {agrupar(items).map(([grupo, lista]) => (
          <div key={grupo} className="flex flex-col gap-px px-3">
            {grupo ? <p className="t-overline px-2 pt-4 pb-1.5">{grupo}</p> : null}
            {lista.map((item) => {
              const activo = esActivo(rutaActual, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex h-[34px] items-center gap-2.5 rounded-sm px-2 text-base font-medium",
                    activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill hover:text-fg",
                  )}
                >
                  <item.icono className={cn("size-4", activo && "text-accent")} aria-hidden />
                  <span className="truncate">{item.etiqueta}</span>
                  {item.contador !== undefined ? (
                    <span className="t-numeric ml-auto text-xs text-fg-subtle">
                      {item.contador}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      {usuario ? (
        <div className="flex items-center gap-2.5 border-t border-border px-4 py-3">
          <Avatar nombre={usuario.nombre} />
          <span className="min-w-0">
            <span className="block truncate text-base font-medium text-fg">{usuario.nombre}</span>
            {usuario.rol ? (
              <span className="block truncate text-xs text-fg-muted">{usuario.rol}</span>
            ) : null}
          </span>
        </div>
      ) : null}
    </nav>
  );
}
