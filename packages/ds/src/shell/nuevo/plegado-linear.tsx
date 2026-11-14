"use client";

import { PanelLeft } from "lucide-react";
import { useEffect } from "react";

type Props = {
  /** Asoma el menú sobre la página (al pasar el mouse). */
  onAsomar: () => void;
  /** Deja el menú fijo otra vez (al hacer clic). */
  onFijar: () => void;
};

/**
 * Menú plegado como en Linear (CAR-442), solo con mouse o trackpad (`pointer: fine`, ver styles.css):
 * no queda riel de íconos; arriba a la izquierda de la barra queda un botón que, al pasar el mouse,
 * asoma el menú sobre la página y, al hacer clic, lo deja fijo. Una franja de 8 px en el borde
 * izquierdo de la ventana también lo asoma. En pantallas táctiles sigue el riel del diseño aprobado.
 */
export function PlegadoLinear({ onAsomar, onFijar }: Props) {
  return (
    <>
      <div data-shell="borde-asomar" aria-hidden onPointerEnter={onAsomar} />
      <button
        type="button"
        data-shell="mostrar-menu"
        onPointerEnter={onAsomar}
        onFocus={onAsomar}
        onClick={onFijar}
        aria-label="Mostrar el menú"
        title="Mostrar el menú ( [ )"
        className="fixed top-3 left-3 z-30 size-9 items-center justify-center rounded-md text-fg-muted hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus"
      >
        <PanelLeft className="size-[18px]" aria-hidden />
      </button>
    </>
  );
}

/** Atajo de Linear: «[» pliega o fija el menú, salvo mientras se escribe. */
export function useAtajoMenu(alternar: () => void): void {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input, textarea, select")))
        return;
      e.preventDefault();
      alternar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [alternar]);
}
