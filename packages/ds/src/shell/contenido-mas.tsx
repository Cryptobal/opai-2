"use client";

import { Button } from "../components/button";
import { cn } from "../cn";
import { useState } from "react";
import { Sheet } from "../components/dialog";
import type { ItemMenu } from "../components/menu";
import { AreaGrupo } from "./area-grupo";
import { Fijados, type ItemFijado } from "./fijados";
import { agrupar } from "./sidebar-item";
import { esActivo, type NavItem } from "./types";

/** Contenido del menú móvil: se descarga al abrir, no con el shell de todos los portales. */
export function ContenidoMas({ items, extras, abierto, onCerrar, onNavegar, onRestaurarFoco, rutaActual, fijados, errorFijados, reintentarFijados, onDesfijar }: {
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
  const [area, setArea] = useState(() => grupos.find(([, lista]) => lista.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn)))?.[0] ?? "");
  const navegar = (href: string) => {
    onCerrar();
    (onNavegar ?? ((h: string) => window.location.assign(h)))(href);
  };
  // Entrada suelta (Inicio, Configuración): mismo margen e icono que el encabezado de área (Item, §8.2.2).
  const entrada = (i: NavItem) => {
    const activo = esActivo(rutaActual, i.href, i.exacta, i.activoEn);
    return <Button key={i.href} variant="ghost" className={cn("w-full justify-start gap-2.5 px-2 md:h-11", activo ? "bg-fill text-fg" : "text-fg-muted")} aria-current={activo ? "page" : undefined} onClick={() => navegar(i.href)}><i.icono className={cn("size-4", activo && "text-accent")} aria-hidden />{i.etiqueta}</Button>;
  };
  // Entrada de área: sangrada, sin icono y con guía vertical, como en la barra lateral (EntradaArea).
  const subEntrada = (i: NavItem) => {
    const activo = esActivo(rutaActual, i.href, i.exacta, i.activoEn);
    return (
      <div key={i.href} className="relative flex pl-[26px]">
        <span aria-hidden className={cn("absolute top-1 bottom-1 left-[19px] w-px", activo ? "w-[3px] rounded-r-[2px] bg-accent" : "bg-border")} />
        <Button variant="ghost" className={cn("w-full justify-start px-2 md:h-11", activo ? "text-fg" : "text-fg-muted")} aria-current={activo ? "page" : undefined} onClick={() => navegar(i.href)}>{i.etiqueta}</Button>
      </div>
    );
  };
  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} onRestaurarFoco={onRestaurarFoco} titulo="Más">
      <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom)]">
        {fijados ? <Fijados items={fijados} rutaActual={rutaActual} onDesfijar={onDesfijar ?? (() => undefined)} className="px-0" onNavegar={navegar} {...(errorFijados ? { error: true } : {})} {...(reintentarFijados ? { reintentar: reintentarFijados } : {})} /> : null}
        {grupos.map(([grupo, lista]) => grupo && lista.length > 1 ? <AreaGrupo key={grupo} etiqueta={grupo} icono={lista[0]!.icono} abierto={area === grupo} activa={lista.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn))} onAlternar={() => setArea(area === grupo ? "" : grupo)}>{lista.map(subEntrada)}</AreaGrupo> : lista.map(entrada))}
        {pie.length ? <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">{pie.map(entrada)}</div> : null}
        {extras.length ? <p className="t-overline mt-3 mb-1 px-2 text-fg-muted">Cuenta</p> : null}
        {extras.map((e) => (
          <Button key={e.id} variant="ghost" className={cn("w-full justify-start gap-2.5 px-2 text-fg-muted md:h-11", e.peligro && "text-danger")} disabled={e.deshabilitado} onClick={() => {
            onCerrar();
            e.onSelect?.();
          }}>
            {e.icono ? <e.icono className="size-4" aria-hidden /> : null}{e.etiqueta}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}
