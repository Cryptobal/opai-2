"use client";

import { useEffect, useState } from "react";

const ESPERA_MS = 250;
const MINIMO = 2;

/** Texto que se manda al servidor: recortado y solo si tiene al menos 2 caracteres. */
const textoBusqueda = (q: string) => (q.trim().length >= MINIMO ? q.trim() : "");

/** Texto de búsqueda ya recortado, que cambia 250 ms después de dejar de escribir. */
export function useBusquedaDiferida(escrito: string) {
  const [q, setQ] = useState(() => textoBusqueda(escrito));
  useEffect(() => {
    const t = setTimeout(() => setQ(textoBusqueda(escrito)), ESPERA_MS);
    return () => clearTimeout(t);
  }, [escrito]);
  return q;
}
