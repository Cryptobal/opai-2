"use client";

import { lazy, type ReactNode, Suspense, useRef, useState } from "react";

import { Button } from "../components/button";
import type { ItemMenu } from "../components/menu";
import type { BusquedaMasRender, NavItem } from "./types";
import type { ItemFijado } from "./fijados";

type Props = {
  items: readonly NavItem[];
  extras: readonly ItemMenu[];
  disparador: ReactNode;
  onNavegar?: (href: string) => void;
  rutaActual: string;
  fijados?: readonly ItemFijado[];
  errorFijados?: boolean;
  reintentarFijados?: () => void;
  onDesfijar?: (href: string) => void;
  onFijar?: (item: ItemFijado) => void;
  epoca?: string;
  busqueda?: BusquedaMasRender | undefined;
  recientes?: () => readonly ItemFijado[];
  /** Nombre accesible del botón: debe contener el texto visible («Menú» en el diseño nuevo). */
  etiqueta?: string;
};
const Contenido = lazy(() => import("./contenido-mas").then((m) => ({ default: m.ContenidoMas })));

/** Menú «Más» del teléfono, variante A del diseño aprobado (CAR-182): hoja inferior con áreas plegables. */
export function MenuMas({ items, extras, disparador, onNavegar, etiqueta, ...otros }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        variant="ghost"
        aria-label={etiqueta ?? "Más opciones"}
        className="h-14 w-full p-0"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={(e) => { disparadorRef.current = e.currentTarget; setMontado(true); setAbierto(true); }}
      >
        {disparador}
      </Button>
      {montado ? <Suspense fallback={null}>
        <Contenido items={items} extras={extras} {...otros} abierto={abierto} onCerrar={() => setAbierto(false)} onNavegar={onNavegar} onRestaurarFoco={() => disparadorRef.current?.focus()} />
      </Suspense> : null}
    </>
  );
}
