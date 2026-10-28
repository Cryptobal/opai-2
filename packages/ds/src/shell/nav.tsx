import { Menu as IconoMenu } from "lucide-react";

import { cn } from "../cn";
import type { ItemMenu } from "../components/menu";
import { Contador, Punto } from "./contador";
import { MenuMas } from "./menu-mas";
import type { ItemFijado } from "./fijados";
import { esActivo, LinkPorDefecto, type LinkComponent, type NavItem } from "./types";

export type NavProps = {
  items: readonly NavItem[];
  rutaActual: string;
  Link?: LinkComponent | undefined;
};

const claseItemInferior = (activo: boolean) =>
  cn(
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs leading-3 font-medium",
    activo ? "text-fg" : "text-fg-subtle",
  );

type InferiorProps = NavProps & {
  principales?: readonly NavItem[] | undefined;
  /** Ítems de cuenta al final del menú "Más" (contraseña, cerrar sesión). */
  extras?: readonly ItemMenu[];
  onNavegar?: (href: string) => void;
  fijados?: readonly ItemFijado[];
  errorFijados?: boolean;
  reintentarFijados?: () => void;
  onDesfijar?: (href: string) => void;
};

/**
 * Teléfono (ShellPhone): barra inferior de hasta 5 ítems; si hay más, 4 y "Más". 56 px + safe-area.
 * La búsqueda va en la barra superior (ADR-050, reemplaza la D7). Activo: ícono en acento y etiqueta en fg.
 */
export function BottomNav({
  items,
  rutaActual,
  Link = LinkPorDefecto,
  extras = [],
  onNavegar,
  principales: elegidas,
  fijados, errorFijados, reintentarFijados, onDesfijar,
}: InferiorProps) {
  // "Instalaciones" (fueraInferior) pasa a "Más" sin desaparecer del riel ni de la barra lateral.
  const principales = elegidas ?? items.filter((i) => !i.pie && !i.soloAmplio && !i.fueraInferior);
  const cupoNav = 4;
  const conMas =
    Boolean(elegidas) ||
    principales.length > 5 ||
    extras.length > 0 ||
    items.some((i) => i.soloAmplio || i.fueraInferior);
  const visibles = conMas ? principales.slice(0, cupoNav) : principales;
  const resto = elegidas
    ? items.filter((i) => !visibles.some((v) => v.href === i.href))
    : [
        ...principales.slice(visibles.length),
        ...items.filter((i) => i.pie || i.soloAmplio || i.fueraInferior),
      ];
  const enResto = resto.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn));
  return (
    <nav
      aria-label="Principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden"
    >
      <ul className="flex px-1">
        {visibles.map((item) => {
          const activo = esActivo(rutaActual, item.href, item.exacta, item.activoEn);
          return (
            <li key={item.href} className="relative min-w-0 flex-1">
              <Link
                href={item.href}
                title={item.etiqueta}
                aria-label={item.etiqueta}
                aria-current={activo ? "page" : undefined}
                className={claseItemInferior(activo)}
              >
                <span className="relative">
                  <item.icono className={cn("size-5", activo && "text-accent")} aria-hidden />
                  {item.punto ? (
                    <Punto visible={item.alerta} />
                  ) : (
                    <Contador n={item.alerta ? item.contador : undefined} />
                  )}
                </span>
                <span lang="es" className="w-full hyphens-auto wrap-normal text-center">{item.corta ?? item.etiqueta}</span>
              </Link>
            </li>
          );
        })}
        {conMas ? (
          <li className="min-w-0 flex-1">
            <MenuMas
              items={items}
              rutaActual={rutaActual}
              {...(fijados ? { fijados } : {})}
              {...(errorFijados ? { errorFijados } : {})}
              {...(reintentarFijados ? { reintentarFijados } : {})}
              {...(onDesfijar ? { onDesfijar } : {})}
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
