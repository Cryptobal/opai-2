import { cn } from "../cn";
import type { ItemMenu } from "../components/menu";
import { PortalSwitcher } from "./portal-switcher";
import {
  esActivo,
  LinkPorDefecto,
  type LinkComponent,
  type NavItem,
  type Portal,
  type Tenant,
} from "./types";

type SidebarProps = {
  items: readonly NavItem[];
  rutaActual: string;
  Link?: LinkComponent;
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant;
  /** Cambiar de empresa (ítems del menú del monograma). */
  empresas?: readonly ItemMenu[];
};

function agrupar(items: readonly NavItem[]): [string, NavItem[]][] {
  const grupos = new Map<string, NavItem[]>();
  for (const item of items) {
    const g = item.grupo ?? "";
    grupos.set(g, [...(grupos.get(g) ?? []), item]);
  }
  return [...grupos.entries()];
}

function Item({
  item,
  rutaActual,
  Link,
}: {
  item: NavItem;
  rutaActual: string;
  Link: LinkComponent;
}) {
  const activo = esActivo(rutaActual, item.href);
  return (
    <Link
      href={item.href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex h-[35px] items-center gap-2.5 rounded-md px-2 text-base font-medium",
        activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill hover:text-fg",
      )}
    >
      <item.icono className={cn("size-4", activo && "text-accent")} aria-hidden />
      <span className="truncate">{item.etiqueta}</span>
      {item.contador !== undefined ? (
        <span className="t-numeric ml-auto text-xs text-fg-subtle">{item.contador}</span>
      ) : null}
    </Link>
  );
}

/** Desktop: barra lateral de 248 px con marca y monograma de la empresa, grupos y Configuración al pie. */
export function Sidebar(props: SidebarProps) {
  const { items, rutaActual, Link = LinkPorDefecto } = props;
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-border bg-surface xl:flex"
    >
      <div className="flex h-[60px] flex-none items-center justify-between border-b border-border pr-2 pl-5">
        <span className="text-[17px] leading-6 font-bold tracking-[-0.02em] text-fg">OPAI</span>
        <PortalSwitcher
          portales={props.portales}
          portalActual={props.portalActual}
          {...(props.tenant ? { tenant: props.tenant } : {})}
          {...(props.empresas ? { extra: props.empresas } : {})}
          variante="monograma"
        />
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {agrupar(items.filter((i) => !i.pie)).map(([grupo, lista]) => (
          <div key={grupo} className="flex flex-col gap-px px-3">
            {grupo ? <p className="t-overline px-2 pt-4 pb-1.5">{grupo}</p> : null}
            {lista.map((item) => (
              <Item key={item.href} item={item} rutaActual={rutaActual} Link={Link} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-px px-3 py-3">
        {items
          .filter((i) => i.pie)
          .map((item) => (
            <Item key={item.href} item={item} rutaActual={rutaActual} Link={Link} />
          ))}
      </div>
    </nav>
  );
}
