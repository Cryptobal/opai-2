"use client";

import { useCallback, useRef, useState } from "react";

import type { Contexto, Mensaje, Nivel } from "./tipos";

export type FichaAgente = { contexto: Contexto; etiqueta?: string | undefined };
export type MetaConversacion = { titulo: string; archivada: boolean };

const titular = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 80);

/** Estado local del hilo: mensajes, conversación, ficha y generación. */
export function useHiloEstado() {
  const [nivel, setNivel] = useState<Nivel>("paso_a_paso");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [trabajando, setTrabajando] = useState(false);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaConversacion | null>(null);
  const [ficha, setFicha] = useState<FichaAgente | null>(null);
  const conversacionRef = useRef<string | null>(null);
  const generacionRef = useRef(0);

  const poner = useCallback(
    (id: string, cambio: (m: Mensaje) => Mensaje) =>
      setMensajes((ms) => ms.map((m) => (m.id === id ? cambio(m) : m))),
    [],
  );

  const alConversacion = useCallback((id: string, texto: string) => {
    if (id !== conversacionRef.current) setMeta({ titulo: titular(texto), archivada: false });
    conversacionRef.current = id;
    setConversacionId(id);
  }, []);

  const cargar = useCallback(
    (
      id: string | null,
      hilo: Mensaje[],
      datos: MetaConversacion | null,
      resetPendiente: () => void,
    ) => {
      generacionRef.current += 1;
      resetPendiente();
      setTrabajando(false);
      conversacionRef.current = id;
      setConversacionId(id);
      setMeta(datos);
      setFicha(null);
      setMensajes(hilo);
    },
    [],
  );

  return {
    nivel,
    setNivel,
    mensajes,
    setMensajes,
    trabajando,
    setTrabajando,
    conversacionId,
    meta,
    setMeta,
    ficha,
    setFicha,
    conversacionRef,
    generacionRef,
    poner,
    alConversacion,
    cargar,
  };
}
