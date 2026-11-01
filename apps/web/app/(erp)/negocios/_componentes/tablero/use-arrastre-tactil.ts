"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import type { EtapaTablero } from "./use-mover";

/** Un gesto corto conserva el scroll nativo; mantener 400 ms activa el arrastre. */
export function useArrastreTactil(
  etapas: EtapaTablero[],
  mover: (id: string, etapa: EtapaTablero) => Promise<unknown>,
) {
  const ref = useRef<HTMLDivElement>(null);
  // El selector actualiza la URL al deslizar: esos renders no deben cancelar un gesto en curso.
  const soltar = useEffectEvent((negocio: string, etapaId: string) => {
    const destino = etapas.find((e) => e.id === etapaId);
    if (destino) void mover(negocio, destino);
  });
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    let gesto: {
      tarjeta: HTMLElement;
      etapa: string;
      x: number;
      y: number;
      activo: boolean;
    } | null = null;
    let destino: HTMLElement | null = null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let suprimirClick = false;
    const limpiar = () => {
      clearTimeout(temporizador);
      raiz.querySelector("#columnas-tablero")?.removeAttribute("data-arrastrando");
      gesto?.tarjeta.removeAttribute("aria-grabbed");
      destino?.removeAttribute("data-sobre");
      destino = null;
      gesto = null;
    };
    const iniciar = (e: TouchEvent) => {
      limpiar();
      suprimirClick = false;
      if (e.touches.length !== 1 || !(e.target instanceof Element)) return;
      if (e.target.closest("button, [role=menuitem]")) return;
      const tarjeta = e.target.closest<HTMLElement>('[data-negocio][draggable="true"]');
      const etapa = tarjeta?.closest<HTMLElement>("[data-etapa]")?.dataset["etapa"];
      const t = e.touches[0];
      if (!tarjeta || !etapa || !t) return;
      gesto = { tarjeta, etapa, x: t.clientX, y: t.clientY, activo: false };
      temporizador = setTimeout(() => {
        if (!gesto) return;
        gesto.activo = true;
        raiz.querySelector("#columnas-tablero")?.setAttribute("data-arrastrando", "");
        gesto.tarjeta.setAttribute("aria-grabbed", "true");
      }, 400);
    };
    const desplazar = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!gesto || !t) return;
      if (e.touches.length !== 1) return limpiar();
      if (!gesto.activo) {
        if (Math.hypot(t.clientX - gesto.x, t.clientY - gesto.y) > 8) limpiar();
        return;
      }
      e.preventDefault();
      suprimirClick = true;
      const tablero = raiz.querySelector<HTMLElement>("#columnas-tablero");
      // Durante el arrastre acercarse al borde revela la columna vecina.
      if (tablero) {
        const rect = tablero.getBoundingClientRect();
        if (t.clientX > rect.right - 48) tablero.scrollLeft += 32;
        if (t.clientX < rect.left + 48) tablero.scrollLeft -= 32;
      }
      destino?.removeAttribute("data-sobre");
      // Una etapa vacía sigue recibiendo tarjetas por debajo de su estado compacto.
      const limite = tablero?.getBoundingClientRect();
      destino =
        limite && t.clientY >= limite.top && t.clientY <= limite.bottom
          ? ([...raiz.querySelectorAll<HTMLElement>("[data-etapa]")].find((col) => {
              const rect = col.getBoundingClientRect();
              return t.clientX >= rect.left && t.clientX <= rect.right;
            }) ?? null)
          : null;
      destino?.setAttribute("data-sobre", "");
    };
    const terminar = (e: TouchEvent) => {
      const g = gesto;
      const etapa = destino?.dataset["etapa"];
      if (g?.activo) {
        e.preventDefault();
        suprimirClick = true;
      }
      limpiar();
      if (g?.activo && etapa && etapa !== g.etapa)
        soltar(g.tarjeta.dataset["negocio"] ?? "", etapa);
    };
    const cancelar = () => limpiar();
    const click = (e: MouseEvent) => {
      if (!suprimirClick) return;
      e.preventDefault();
      e.stopPropagation();
      suprimirClick = false;
    };
    const contexto = (e: Event) => {
      if (gesto) e.preventDefault();
    };
    raiz.addEventListener("touchstart", iniciar, { passive: true });
    raiz.addEventListener("touchmove", desplazar, { passive: false });
    raiz.addEventListener("touchend", terminar, { passive: false });
    raiz.addEventListener("touchcancel", cancelar);
    raiz.addEventListener("click", click, true);
    raiz.addEventListener("contextmenu", contexto);
    return () => {
      limpiar();
      raiz.removeEventListener("touchstart", iniciar);
      raiz.removeEventListener("touchmove", desplazar);
      raiz.removeEventListener("touchend", terminar);
      raiz.removeEventListener("touchcancel", cancelar);
      raiz.removeEventListener("click", click, true);
      raiz.removeEventListener("contextmenu", contexto);
    };
  }, []);
  return ref;
}
