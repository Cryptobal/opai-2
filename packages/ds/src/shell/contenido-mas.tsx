"use client";

import { Button } from "../components/button";
import { Sheet } from "../components/dialog";
import type { ItemMenu } from "../components/menu";
import type { NavItem } from "./types";

/** Contenido del menú móvil: se descarga al abrir, no con el shell de todos los portales. */
export function ContenidoMas({ items, extras, abierto, onCerrar, onNavegar, onRestaurarFoco }: {
  items: readonly NavItem[];
  extras: readonly ItemMenu[];
  abierto: boolean;
  onCerrar: () => void;
  onRestaurarFoco: () => void;
  onNavegar?: ((href: string) => void) | undefined;
}) {
  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} onRestaurarFoco={onRestaurarFoco} titulo="Más">
      <div className="flex flex-col gap-1">
        {items.map((i, indice) => (
          <div key={i.href}>
            {i.grupo && items[indice - 1]?.grupo !== i.grupo ? (
              <p className="t-overline mt-3 mb-1 text-fg-muted">{i.grupo}</p>
            ) : null}
            <Button variant="ghost" className="w-full justify-start" onClick={() => {
              onCerrar();
              (onNavegar ?? ((h: string) => window.location.assign(h)))(i.href);
            }}>
              <i.icono className="size-5" aria-hidden />
              {i.etiqueta}
            </Button>
          </div>
        ))}
        {extras.map((e) => (
          <Button key={e.id} variant="ghost" className="w-full justify-start" onClick={() => {
            onCerrar();
            e.onSelect?.();
          }}>
            {e.etiqueta}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}
