"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";

/** Ancho del menú lateral del diseño nuevo (CAR-442): base, mínimo y máximo, en píxeles. */
export const ANCHO_BASE = 248;
export const ANCHO_MIN = 200;
export const ANCHO_MAX = 330;
/** Soltado más a la izquierda que esto, el menú se pliega (como en Linear). */
export const UMBRAL_PLEGAR = 140;
const PASO_TECLADO = 16;

/** Ancho dentro de los límites, en píxeles enteros. */
export function anchoValido(ancho: number): number {
  if (!Number.isFinite(ancho)) return ANCHO_BASE;
  return Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, Math.round(ancho)));
}

/** Teclado del borde: flechas de a 16 px, Inicio y Fin a los límites, Enter al ancho base. */
export function anchoPorTecla(tecla: string, ancho: number): number | undefined {
  if (tecla === "ArrowLeft") return anchoValido(ancho - PASO_TECLADO);
  if (tecla === "ArrowRight") return anchoValido(ancho + PASO_TECLADO);
  if (tecla === "Home") return ANCHO_MIN;
  if (tecla === "End") return ANCHO_MAX;
  if (tecla === "Enter") return ANCHO_BASE;
  return undefined;
}

/** Qué hacer al soltar el borde: plegar si quedó muy a la izquierda o fijar el ancho nuevo. */
export function alSoltar(x: number): { plegar: true } | { plegar: false; ancho: number } {
  return x < UMBRAL_PLEGAR ? { plegar: true } : { plegar: false, ancho: anchoValido(x) };
}

type Props = {
  ancho: number;
  onAncho: (ancho: number) => void;
  onPlegar: () => void;
};

/**
 * Borde del menú lateral fijo, en escritorio (CAR-442, referente Linear): arrastrarlo cambia el ancho
 * entre 200 y 330 px (como Linear); soltarlo muy a la izquierda pliega el menú. Mientras se arrastra,
 * el ancho cambia directo en la variable CSS, sin pintar de nuevo el shell. Doble clic vuelve al ancho
 * base. Solo con mouse o trackpad (`pointer: fine`): en pantallas táctiles no hay borde que tomar.
 */
export function AsaMenu({ ancho, onAncho, onPlegar }: Props) {
  const raiz = useRef<HTMLElement | null>(null);
  const inicio = useRef(0);
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (!raiz.current) return;
    const x = e.clientX < UMBRAL_PLEGAR ? e.clientX : anchoValido(e.clientX);
    raiz.current.style.setProperty("--ancho-menu", `${Math.max(x, 0)}px`);
  };
  const empezar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    inicio.current = e.clientX;
    raiz.current = e.currentTarget.closest<HTMLElement>("[data-menu]");
    raiz.current?.setAttribute("data-arrastre", "");
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const terminar = (): boolean => {
    const r = raiz.current;
    if (!r) return false;
    raiz.current = null;
    r.removeAttribute("data-arrastre");
    r.style.setProperty("--ancho-menu", `${ancho}px`);
    return true;
  };
  const soltar = (e: PointerEvent<HTMLDivElement>) => {
    if (!terminar()) return;
    if (Math.abs(e.clientX - inicio.current) < 3) return; // un clic sin arrastrar no cambia nada
    const fin = alSoltar(e.clientX);
    if (fin.plegar) onPlegar();
    else onAncho(fin.ancho);
  };
  const tecla = (e: KeyboardEvent<HTMLDivElement>) => {
    const destino = anchoPorTecla(e.key, ancho);
    if (destino === undefined) return;
    e.preventDefault();
    onAncho(destino);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Cambiar el ancho del menú"
      aria-valuenow={ancho}
      aria-valuemin={ANCHO_MIN}
      aria-valuemax={ANCHO_MAX}
      aria-valuetext={`${ancho} píxeles`}
      tabIndex={0}
      data-shell="asa-menu"
      onPointerDown={empezar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={() => void terminar()}
      onDoubleClick={() => onAncho(ANCHO_BASE)}
      onKeyDown={tecla}
      className="group fixed inset-y-0 z-30 hidden w-2 -translate-x-1 cursor-col-resize touch-none outline-none focus-visible:outline-2 focus-visible:outline-focus lg:block"
    >
      <span className="mx-auto block h-full w-px bg-transparent transition-colors duration-150 group-hover:bg-border-strong group-focus-visible:bg-accent" />
    </div>
  );
}
