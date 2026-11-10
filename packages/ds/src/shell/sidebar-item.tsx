import { cn } from "../cn";
import { Avatar } from "../components/avatar";
import type { ItemMenu } from "../components/menu";
import { PinDiferido as BotonFijar } from "./pin-diferido";
import { esActivo, type LinkComponent, type NavItem, type Usuario } from "./types";
import { UserMenu } from "./user-menu";

export function agrupar(items: readonly NavItem[]): [string, NavItem[]][] {
  const grupos = new Map<string, NavItem[]>();
  for (const item of items) {
    const g = item.grupo ?? "";
    grupos.set(g, [...(grupos.get(g) ?? []), item]);
  }
  return [...grupos.entries()];
}

type ItemProps = {
  item: NavItem;
  rutaActual: string;
  Link: LinkComponent;
  onFijar?: (() => void) | undefined;
  fijado?: boolean;
};

export function Item({ item, rutaActual, Link, onFijar, fijado }: ItemProps) {
  const activo = esActivo(rutaActual, item.href, item.exacta, item.activoEn);
  return (
    <div className="group relative flex items-center">
      <Link
        href={item.href}
        title={item.etiqueta}
        aria-label={item.etiqueta}
        aria-current={activo ? "page" : undefined}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 pr-11 text-base font-medium",
          activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill hover:text-fg",
        )}
      >
        <item.icono className={cn("size-4", activo && "text-accent")} aria-hidden />
        <span className="truncate">{item.etiqueta}</span>
        {item.contador !== undefined ? (
          <span className="t-numeric ml-auto text-xs text-fg-subtle">{item.contador}</span>
        ) : null}
      </Link>
      {item.fijable && onFijar ? (
        <BotonFijar fijado={Boolean(fijado)} onFijar={onFijar} className="absolute right-1" />
      ) : null}
    </div>
  );
}

/** Entrada de área (§8.2.2): sin icono, con guía vertical; la activa la marca el acento. */
export function EntradaArea({ item, rutaActual, Link, onFijar, fijado }: ItemProps) {
  const activo = esActivo(rutaActual, item.href, item.exacta, item.activoEn);
  return (
    <div className="group relative flex items-center pl-[26px]">
      <span
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 left-[19px] w-px",
          activo ? "w-[3px] rounded-r-[2px] bg-accent" : "bg-border",
        )}
      />
      <Link
        href={item.href}
        title={item.etiqueta}
        aria-label={item.etiqueta}
        aria-current={activo ? "page" : undefined}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center rounded-md px-2 pr-11 text-base font-medium",
          activo ? "text-fg" : "text-fg-muted hover:bg-fill hover:text-fg",
        )}
      >
        <span className="truncate">{item.etiqueta}</span>
      </Link>
      {item.fijable && onFijar ? (
        <BotonFijar fijado={Boolean(fijado)} onFijar={onFijar} className="absolute right-1" />
      ) : null}
    </div>
  );
}

export function Pie({
  usuario,
  menu,
}: {
  usuario: Usuario;
  menu?: readonly ItemMenu[] | undefined;
}) {
  return (
    <div className="flex-none border-t border-border px-3 py-2">
      {menu ? (
        <UserMenu
          usuario={usuario}
          items={menu}
          lado="arriba-izquierda"
          conNombre
        />
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
