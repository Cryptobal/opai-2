"use client";

import { type ReactNode, useState } from "react";

import { Button } from "../components/button";
import { Sheet } from "../components/dialog";
import type { ItemMenu } from "../components/menu";
import type { NavItem } from "./types";

type Props = {
  items: readonly NavItem[];
  extras: readonly ItemMenu[];
  disparador: ReactNode;
  onNavegar?: (href: string) => void;
};

/** Hoja por áreas del diseño aprobado (16–18), sobre el Sheet Radix del DS. */
export function MenuMas({ items, extras, disparador, onNavegar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const ir = (href: string) => {
    setAbierto(false);
    (onNavegar ?? ((h: string) => window.location.assign(h)))(href);
  };
  return (
    <>
      <Button
        variant="ghost"
        aria-label="Más opciones"
        className="h-14 w-full p-0"
        onClick={() => setAbierto(true)}
      >
        {disparador}
      </Button>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Más">
        <div className="flex flex-col gap-1">
          {items.map((i, indice) => (
            <div key={i.href}>
              {i.grupo && items[indice - 1]?.grupo !== i.grupo ? (
                <p className="t-overline mt-3 mb-1 text-fg-muted">{i.grupo}</p>
              ) : null}
              <Button variant="ghost" className="w-full justify-start" onClick={() => ir(i.href)}>
                <i.icono className="size-5" aria-hidden />
                {i.etiqueta}
              </Button>
            </div>
          ))}
          {extras.map((e) => (
            <Button
              key={e.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setAbierto(false);
                e.onSelect?.();
              }}
            >
              {e.etiqueta}
            </Button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
