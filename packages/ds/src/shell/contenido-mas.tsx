"use client";

import { Button } from "../components/button";
import { cn } from "../cn";
import { Sheet } from "../components/dialog";
import type { ItemMenu } from "../components/menu";
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
        {grupos.map(([grupo, lista]) => (
          <section key={grupo || "inicio"}>
            {grupo ? <h2 className="t-overline mt-3 px-2 py-2 text-fg-muted">{grupo}</h2> : null}
            {lista.map(entrada)}
          </section>
        ))}
        {pie.length ? (
          <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">
            {pie.map(entrada)}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
