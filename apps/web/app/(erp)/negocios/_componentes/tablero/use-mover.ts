"use client";

import { useState } from "react";

import { avisar } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { useParametros } from "@/app/_components/maestros/use-url";

export type EtapaTablero = { id: string; nombre: string; tipo: string };

/**
 * Mover un negocio a otra etapa desde el tablero (arrastre o «Mover a…»). A una etapa abierta llama a
 * `comercial.negocios.mover`; si faltan requisitos (R9/R10) abre la hoja Mover. A la ganada o la
 * perdida abre la hoja Ganar o Perder. Sin estado optimista: la tarjeta cambia de columna cuando la
 * escritura vuelve (la acción revalida la página); si falla, se queda donde estaba y se avisa.
 */
export function useMover() {
  const { fijar } = useParametros();
  const [moviendo, setMoviendo] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState("");
  async function mover(negocioId: string, destino: EtapaTablero) {
    if (destino.tipo === "ganada") return fijar({ negocio: negocioId, ganar: "1" });
    if (destino.tipo === "perdida") return fijar({ negocio: negocioId, perder: "1" });
    setMoviendo(negocioId);
    setAnuncio(`Moviendo a ${destino.nombre}…`);
    // La tarjeta se atenúa mientras tanto (aria-busy), sin cambiar de columna antes de tiempo.
    const tarjeta = document.querySelector(`[data-negocio="${negocioId}"]`);
    tarjeta?.setAttribute("aria-busy", "true");
    try {
      const r = await ejecutarCapacidad("erp", "comercial.negocios.mover", {
        id: negocioId,
        etapaId: destino.id,
      });
      if (r.ok) {
        setAnuncio(`Movido a ${destino.nombre}`);
        avisar.exito(`Movido a ${destino.nombre}`);
        return;
      }
      // Requisitos de entrada (R9) o instalación (R10): la hoja Mover pide lo que falta.
      if (r.error.code === "UNPROCESSABLE" && /Faltan requisitos|Vincula/.test(r.error.message)) {
        setAnuncio("");
        return fijar({ negocio: negocioId, mover: destino.id });
      }
      setAnuncio(`No se movió: ${r.error.message}`);
      avisar.error(r.error.message);
    } catch {
      setAnuncio("No se movió el negocio.");
      avisar.error("No pudimos mover el negocio. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      tarjeta?.removeAttribute("aria-busy");
      setMoviendo(null);
    }
  }
  return { mover, moviendo, anuncio };
}
