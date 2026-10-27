"use client";

import { Button } from "../components/button";
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
  const [area, setArea] = useState(() => grupos.find(([, lista]) => lista.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn)))?.[0] ?? "");
  const entrada = (i: NavItem) => <Button key={i.href} variant="ghost" className="w-full justify-start" aria-current={esActivo(rutaActual, i.href, i.exacta, i.activoEn) ? "page" : undefined} onClick={() => {
    onCerrar();
    (onNavegar ?? ((h: string) => window.location.assign(h)))(i.href);
  }}><i.icono className="size-5" aria-hidden />{i.etiqueta}</Button>;
  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} onRestaurarFoco={onRestaurarFoco} titulo="Más">
      <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom)]">
        {fijados ? <Fijados items={fijados} rutaActual={rutaActual} onDesfijar={onDesfijar ?? (() => undefined)} onNavegar={(href) => { onCerrar(); (onNavegar ?? ((h: string) => window.location.assign(h)))(href); }} {...(errorFijados ? { error: true } : {})} {...(reintentarFijados ? { reintentar: reintentarFijados } : {})} /> : null}
        {grupos.map(([grupo, lista]) => grupo && lista.length > 1 ? <AreaGrupo key={grupo} etiqueta={grupo} icono={lista[0]!.icono} abierto={area === grupo} activa={lista.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn))} onAlternar={() => setArea(area === grupo ? "" : grupo)}>{lista.map(entrada)}</AreaGrupo> : lista.map(entrada))}
        {items.filter((i) => i.pie).map(entrada)}
        {extras.length ? <p className="t-overline mt-3 mb-1 text-fg-muted">Cuenta</p> : null}
        {extras.map((e) => (
          <Button key={e.id} variant="ghost" className={`w-full justify-start ${e.peligro ? "text-danger" : ""}`} disabled={e.deshabilitado} onClick={() => {
            onCerrar();
            e.onSelect?.();
          }}>
            {e.icono ? <e.icono className="size-5" aria-hidden /> : null}{e.etiqueta}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}
