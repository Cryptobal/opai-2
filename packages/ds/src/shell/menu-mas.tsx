"use client";

import type { ReactNode } from "react";

import { type ItemMenu, Menu } from "../components/menu";
import type { NavItem } from "./types";

type Props = {
  items: readonly NavItem[];
  extras: readonly ItemMenu[];
  disparador: ReactNode;
  onNavegar?: (href: string) => void;
};

/** Menú "Más" de la barra inferior del teléfono: el resto de la navegación y la cuenta. */
export function MenuMas({ items, extras, disparador, onNavegar }: Props) {
  const ir = onNavegar ?? ((href: string) => window.location.assign(href));
  const lista: ItemMenu[] = [
    ...items.map((i) => ({
      id: `nav-${i.href}`,
      etiqueta: i.contador ? `${i.etiqueta} (${i.contador})` : i.etiqueta,
      icono: i.icono,
      onSelect: () => ir(i.href),
    })),
    ...extras,
  ];
  return (
    <Menu
      etiqueta="Más opciones"
      items={lista}
      lado="arriba-derecha"
      disparador={disparador}
      className="w-full"
      claseDisparador="w-full rounded-none hover:bg-transparent data-[state=open]:bg-transparent"
    />
  );
}
