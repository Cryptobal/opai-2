"use client";

import { Button } from "../components/button";
import { cn } from "../cn";
import { Sheet } from "../components/dialog";
import type { ItemMenu } from "../components/menu";
import { iconoDeArea } from "./area-iconos";
import { Fijados, type ItemFijado } from "./fijados";
import { agrupar } from "./sidebar-item";
import { esActivo, type NavItem } from "./types";

/** Contenido del menú móvil: se descarga al abrir, no con el shell de todos los portales. */
export function ContenidoMas({
  items,
  abierto,
  onCerrar,
  onNavegar,
  onRestaurarFoco,
  rutaActual,
  fijados,
  errorFijados,
  reintentarFijados,
  onDesfijar,
}: {
  items: readonly NavItem[];
  extras: readonly ItemMenu[];
  abierto: boolean;
  onCerrar: () => void;
  onRestaurarFoco: () => void;
  onNavegar?: ((href: string) => void) | undefined;
  rutaActual: string;
  fijados?: readonly ItemFijado[];
  errorFijados?: boolean;
  reintentarFijados?: () => void;
  onDesfijar?: (href: string) => void;
}) {
  const grupos = agrupar(items.filter((i) => !i.pie));
  const pie = items.filter((i) => i.pie);
  const navegar = (href: string) => {
    onCerrar();
    (onNavegar ?? ((h: string) => window.location.assign(h)))(href);
  };
  // Entrada suelta (Inicio, Configuración): mismo margen e icono que el encabezado de área (Item, §8.2.2).
  const entrada = (i: NavItem) => {
    const activo = esActivo(rutaActual, i.href, i.exacta, i.activoEn);
    return (
      <Button
        key={i.href}
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2.5 px-2 md:h-11",
          activo ? "bg-fill text-fg" : "text-fg-muted",
        )}
        aria-current={activo ? "page" : undefined}
        onClick={() => navegar(i.href)}
      >
        <i.icono className={cn("size-4", activo && "text-accent")} aria-hidden />
        {i.etiqueta}
      </Button>
    );
  };
  // Baldosa de la cuadrícula (opción B, CAR-182): icono en ficha y nombre; la de la página actual
  // lleva borde y ficha de acento para ubicarse de un vistazo.
  const baldosa = (i: NavItem) => {
    const activo = esActivo(rutaActual, i.href, i.exacta, i.activoEn);
    return (
      <Button
        key={i.href}
        variant="ghost"
        className={cn(
          "h-[88px] flex-col justify-center gap-2 rounded-2xl border px-1 text-center text-sm leading-4 font-medium whitespace-normal",
          activo ? "border-accent bg-accent-muted text-fg" : "border-border bg-surface text-fg",
        )}
        aria-current={activo ? "page" : undefined}
        onClick={() => navegar(i.href)}
      >
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-[10px]",
            activo ? "bg-accent text-accent-fg" : "bg-fill text-fg-muted",
          )}
        >
          <i.icono className="size-5" aria-hidden />
        </span>
        {i.etiqueta}
      </Button>
    );
  };
  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} onRestaurarFoco={onRestaurarFoco} titulo="Más">
      <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom)]">
        {fijados ? (
          <Fijados
            items={fijados}
            rutaActual={rutaActual}
            onDesfijar={onDesfijar ?? (() => undefined)}
            className="px-0"
            onNavegar={navegar}
            {...(errorFijados ? { error: true } : {})}
            {...(reintentarFijados ? { reintentar: reintentarFijados } : {})}
          />
        ) : null}
        {grupos.map(([grupo, lista]) => {
          if (!grupo) {
            return <section key="inicio">{lista.map(entrada)}</section>;
          }
          const IconoArea = iconoDeArea(lista[0]?.area);
          return (
            <section key={grupo} aria-label={grupo} className="mt-3">
              <h2 className="t-label-sm flex items-center gap-2 px-1 pb-2 text-fg">
                <IconoArea className="size-4 text-fg-muted" aria-hidden />
                {grupo}
              </h2>
              <div className="grid grid-cols-3 gap-2">{lista.map(baldosa)}</div>
            </section>
          );
        })}
        {pie.length ? (
          <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">
            {pie.map(entrada)}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
