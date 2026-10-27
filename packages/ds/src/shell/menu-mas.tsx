"use client";

import { lazy, type ReactNode, Suspense, useRef, useState } from "react";

import { Button } from "../components/button";
import type { ItemMenu } from "../components/menu";
import type { NavItem } from "./types";

type Props = {
  items: readonly NavItem[];
  extras: readonly ItemMenu[];
  disparador: ReactNode;
  onNavegar?: (href: string) => void;
};
const Contenido = lazy(() => import("./contenido-mas").then((m) => ({ default: m.ContenidoMas })));

/** Hoja por áreas del diseño aprobado (16–18), sobre el Sheet Radix del DS. */
export function MenuMas({ items, extras, disparador, onNavegar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        variant="ghost"
        aria-label="Más opciones"
        className="h-14 w-full p-0"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={(e) => { disparadorRef.current = e.currentTarget; setMontado(true); setAbierto(true); }}
      >
        {disparador}
      </Button>
      {montado ? <Suspense fallback={null}>
        <Contenido items={items} extras={extras} abierto={abierto} onCerrar={() => setAbierto(false)} onNavegar={onNavegar} onRestaurarFoco={() => disparadorRef.current?.focus()} />
      </Suspense> : null}
    </>
  );
}
