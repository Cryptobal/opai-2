"use client";

import { useEffect } from "react";

const DENTRO_DEL_MENU =
  'nav[data-shell="sidebar"], [data-radix-popper-content-wrapper], [role="menu"], [role="dialog"], [role="listbox"]';

/**
 * Menú asomado del diseño nuevo (CAR-335 D2, CAR-442): el riel queda tapado (fuera del árbol de
 * accesibilidad, para no repetir «Principal») y el menú se esconde cuando el mouse se aleja de su
 * ancho actual, también si apareció bajo el mouse sin que se moviera.
 */
export function useCierreAsomado(asomado: boolean, ancho: number, cerrar: () => void): void {
  useEffect(() => {
    const riel = document.querySelector<HTMLElement>('[data-marco="nuevo"] nav[data-shell="riel"]');
    riel?.toggleAttribute("inert", asomado);
    if (asomado) riel?.setAttribute("aria-hidden", "true");
    else riel?.removeAttribute("aria-hidden");
    if (!asomado) return;
    const mover = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "mouse" && e.clientX > ancho + 16) cerrar();
    };
    // En pantalla táctil (iPad) no hay mouse que se aleje: tocar fuera del menú lo cierra. Los menús
    // que abre el propio menú (empresa, usuario) se pintan en <body> y no cuentan como «fuera».
    const tocar = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "mouse" || !(e.target instanceof Element)) return;
      if (!e.target.closest(DENTRO_DEL_MENU)) cerrar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="menu"]')) cerrar();
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerdown", tocar);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerdown", tocar);
      window.removeEventListener("keydown", tecla);
    };
  }, [asomado, ancho, cerrar]);
}
