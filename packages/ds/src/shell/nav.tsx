import { Menu as IconoMenu, Search } from "lucide-react";

import { cn } from "../cn";
import type { ItemMenu } from "../components/menu";
import { Contador } from "./contador";
import { MenuMas } from "./menu-mas";
import { esActivo, LinkPorDefecto, type LinkComponent, type NavItem } from "./types";

export type NavProps = {
  items: readonly NavItem[];
  rutaActual: string;
  Link?: LinkComponent | undefined;
};

const claseItemInferior = (activo: boolean) =>
  cn(
    "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] leading-[14px] font-medium tracking-[0.01em]",
    activo ? "text-fg" : "text-fg-subtle",
  );

type InferiorProps = NavProps & {
  /** Ítems de cuenta al final del menú "Más" (contraseña, cerrar sesión). */
  extras?: readonly ItemMenu[];
  onNavegar?: (href: string) => void;
  /** Abre la búsqueda global (⌘K): con ella, "Buscar" es un ítem fijo de la barra (Brief 05, D7). */
  onBuscar?: (() => void) | undefined;
};

/** Teléfono: barra inferior de hasta 5 ítems; si hay más, 4 y "Más". 56 px + safe-area. */
export function BottomNav({
  items,
  rutaActual,
  Link = LinkPorDefecto,
  extras = [],
  onNavegar,
  onBuscar,
}: InferiorProps) {
  // Con búsqueda (ERP), "Buscar" y "Más" ocupan dos de los cinco espacios: quedan tres para la
  // navegación (Brief 05, respaldo del escenario A: Inicio · Cuentas · Personas · Buscar · Más).
  // "Instalaciones" (fueraInferior) pasa a "Más" sin desaparecer del riel ni de la barra lateral.
  const principales = items.filter((i) => !i.pie && !i.soloAmplio && !i.fueraInferior);
  const cupoNav = onBuscar ? 3 : 4;
  const conMas =
    principales.length > (onBuscar ? 4 : 5) ||
    extras.length > 0 ||
    items.some((i) => i.soloAmplio || i.fueraInferior);
  const visibles = conMas ? principales.slice(0, cupoNav) : principales;
  const resto = [
    ...principales.slice(visibles.length),
    ...items.filter((i) => i.pie || i.soloAmplio || i.fueraInferior),
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
        {onBuscar ? (
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onBuscar}
              aria-label="Buscar"
              className={claseItemInferior(false)}
            >
              <Search className="size-5" aria-hidden />
              Buscar
            </button>
          </li>
        ) : null}
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
