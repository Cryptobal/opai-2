"use client";

import { useCallback, useRef, useState } from "react";

import { useDecision } from "./use-decision";
import { useEnvioAgente } from "./use-envio-agente";
import { useModelos } from "./use-modelos";
import { type Contexto, type Mensaje, type Nivel } from "./tipos";

/** Igual que el servidor al titular una conversación nueva. */
const titular = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 80);
export type FichaAgente = { contexto: Contexto; etiqueta?: string | undefined };
export type MetaConversacion = { titulo: string; archivada: boolean };

/** Estado del hilo del agente. El servidor guarda cada turno en la conversación de la persona (R19). */
export function useAgente(portal: string, abierto: boolean) {
  const { modelos, errorModelos, modelo, setModelo } = useModelos(portal, abierto);
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

  const { enviar, resetPendiente, bloqueo } = useEnvioAgente({
    portal,
    abierto,
    modelo,
    nivel,
    ficha,
    conversacionRef,
    generacionRef,
    setTrabajando,
    setMensajes,
    poner,
    alConversacion,
  });

  const decidir = useDecision(portal, mensajes, poner, bloqueo);

  const cargar = useCallback(
    (id: string | null, hilo: Mensaje[], datos: MetaConversacion | null = null) => {
      generacionRef.current += 1;
      resetPendiente();
      setTrabajando(false);
      conversacionRef.current = id;
      setConversacionId(id);
      setMeta(datos);
      setFicha(null);
      setMensajes(hilo);
    },
    [resetPendiente],
  );
  const nueva = useCallback(() => cargar(null, []), [cargar]);
  const sobreFicha = useCallback(
    (f: FichaAgente) => {
      cargar(null, []);
      setFicha(f);
    },
    [cargar],
  );
  const hayPlanPendiente = mensajes.some(
    (m) =>
      m.plan &&
      (m.plan.estado === "propuesto" ||
        m.plan.estado === "en_curso" ||
        m.plan.estado === "ejecutando"),
  );
  return {
    modelos,
    errorModelos,
    modelo,
    setModelo,
    nivel,
    setNivel,
    mensajes,
    trabajando,
    enviar,
    decidir,
    nueva,
    cargar,
    conversacionId,
    meta,
    setMeta,
    ficha,
    quitarFicha: () => setFicha(null),
    sobreFicha,
    hayPlanPendiente,
  };
}
