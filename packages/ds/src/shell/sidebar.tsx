import { cn } from "../cn";
import { Avatar } from "../components/avatar";
import type { ItemMenu } from "../components/menu";
import { PortalSwitcher } from "./portal-switcher";
import {
  esActivo,
  LinkPorDefecto,
  type LinkComponent,
  type NavItem,
  type Portal,
  type Tenant,
  type Usuario,
} from "./types";
import { UserMenu } from "./user-menu";

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

function Pie({ usuario, menu }: { usuario: Usuario; menu?: readonly ItemMenu[] | undefined }) {
  return (
    <div className="flex-none border-t border-border px-3 py-2">
      {menu ? (
        <UserMenu usuario={usuario} items={menu} lado="arriba-izquierda" conNombre />
      ) : (
        <span className="flex items-center gap-2.5 px-2 py-1">
          <Avatar nombre={usuario.nombre} />
          <span className="min-w-0">
            <span className="t-label-sm block truncate text-fg">{usuario.nombre}</span>
            {usuario.rol ? (
              <span className="t-caption block truncate text-[11px] leading-[14px]">
                {usuario.rol}
              </span>
            ) : null}
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * Desktop (ShellDesktop): barra lateral de 248 px con la marca, el selector de portal y empresa en
 * tarjeta, los grupos, Configuración y el usuario al pie.
 */
export function Sidebar(props: SidebarProps) {
  const { items, rutaActual, Link = LinkPorDefecto } = props;
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-border bg-surface xl:flex"
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
      <div className="flex-1 overflow-y-auto py-2">
        {agrupar(items.filter((i) => !i.pie && !i.soloCompacto)).map(([grupo, lista]) => (
          <div key={grupo} className="flex flex-col gap-px px-3">
            {grupo ? <p className="t-overline px-2 pt-4 pb-1.5">{grupo}</p> : null}
            {lista.map((item) => (
              <Item key={item.href} item={item} rutaActual={rutaActual} Link={Link} />
            ))}
          </div>
        ))}
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
