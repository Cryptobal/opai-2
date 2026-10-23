import { Menu as IconoMenu } from "lucide-react";

import { cn } from "../cn";
import type { ItemMenu } from "../components/menu";
import { MenuMas } from "./menu-mas";
import { esActivo, LinkPorDefecto, type LinkComponent, type NavItem } from "./types";

type NavProps = { items: readonly NavItem[]; rutaActual: string; Link?: LinkComponent };

function Contador({ n }: { n?: number | undefined }) {
  return n ? (
    <span className="t-numeric absolute -top-1.5 left-1/2 ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 text-[11px] leading-none font-semibold text-white shadow-[0_0_0_2px_var(--ds-surface)] dark:bg-danger dark:text-inverse-fg">
      {n}
    </span>
  ) : null;
}

const claseItemInferior = (activo: boolean) =>
  cn(
    "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] leading-[14px] font-medium tracking-[0.01em]",
    activo ? "text-fg" : "text-fg-subtle",
  );

type InferiorProps = NavProps & {
  /** Ítems de cuenta al final del menú "Más" (contraseña, cerrar sesión). */
  extras?: readonly ItemMenu[];
  onNavegar?: (href: string) => void;
};

/** Teléfono: barra inferior de hasta 5 ítems; si hay más, 4 y "Más". 56 px + safe-area. */
export function BottomNav({
  items,
  rutaActual,
  Link = LinkPorDefecto,
  extras = [],
  onNavegar,
}: InferiorProps) {
  const principales = items.filter((i) => !i.pie && !i.soloAmplio);
  const conMas = principales.length > 5 || extras.length > 0 || items.some((i) => i.soloAmplio);
  const visibles = conMas ? principales.slice(0, 4) : principales;
  const resto = [
    ...principales.slice(visibles.length),
    ...items.filter((i) => i.pie || i.soloAmplio),
  ];
  const enResto = resto.some((i) => esActivo(rutaActual, i.href));
  return (
    <nav
      aria-label="Principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden"
    >
      <ul className="flex px-1">
        {visibles.map((item) => {
          const activo = esActivo(rutaActual, item.href);
          return (
            <li key={item.href} className="relative min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={claseItemInferior(activo)}
              >
                <span className="relative">
                  <item.icono className={cn("size-5", activo && "text-accent")} aria-hidden />
                  <Contador n={item.alerta ? item.contador : undefined} />
                </span>
                <span className="max-w-full truncate px-0.5">{item.corta ?? item.etiqueta}</span>
              </Link>
            </li>
          );
        })}
        {conMas ? (
          <li className="min-w-0 flex-1">
            <MenuMas
              items={resto}
              extras={extras}
              {...(onNavegar ? { onNavegar } : {})}
              disparador={
                <span className={claseItemInferior(enResto)}>
                  <IconoMenu className={cn("size-5", enResto && "text-accent")} aria-hidden />
                  Más
                </span>
              }
            />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

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

export type RailProps = NavProps & { subtitulo?: string };

/** iPad: riel de 80 px con la marca arriba, ítems de 64×56 y los ítems fijos (Configuración) al pie. */
export function Rail({ items, rutaActual, Link = LinkPorDefecto, subtitulo }: RailProps) {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh w-20 flex-none flex-col items-center border-r border-border bg-surface py-3 md:flex xl:hidden"
    >
      <span className="mt-2 mb-3 flex flex-col items-center gap-0.5">
        <span className="text-[13px] leading-4 font-bold tracking-[-0.02em] text-fg">OPAI</span>
        {subtitulo ? <span className="t-caption">{subtitulo}</span> : null}
      </span>
      <ul className="flex flex-col gap-1">
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
