"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { ERROR_RED, textoError } from "./mensajes-error";
import { useDecision } from "./use-decision";
import { useModelos } from "./use-modelos";
import {
  type Contexto,
  type Mensaje,
  type Nivel,
  type PlanVista,
  type Turno,
  VIGENCIA_PLAN_MS,
} from "./tipos";

const nuevoId = () => crypto.randomUUID();
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
  const conversacion = useRef<string | null>(null);
  const ocupado = useRef(false);
  /** Sube al sustituir el hilo: la respuesta tardía de un hilo anterior se descarta. */
  const generacion = useRef(0);
  const bloqueo = useMemo(
    () => ({ ocupado: () => ocupado.current, fijar: (v: boolean) => void (ocupado.current = v) }),
    [],
  );

  const poner = useCallback(
    (id: string, cambio: (m: Mensaje) => Mensaje) =>
      setMensajes((ms) => ms.map((m) => (m.id === id ? cambio(m) : m))),
    [],
  );

  const enviar = useCallback(
    async (texto: string) => {
      if (!modelo || ocupado.current) return;
      ocupado.current = true;
      setTrabajando(true);
      const id = nuevoId();
      const turnoId = nuevoId();
      const miGeneracion = generacion.current;
      setMensajes((ms) => [
        ...ms,
        { id: nuevoId(), rol: "yo", texto },
        { id, rol: "agente", texto: "" },
      ]);
      try {
        const r = await ejecutarCapacidad(
          portal,
          "agente.turno.preparar",
          {
            mensaje: texto,
            modelo,
            nivel,
            turnoId,
            ...(conversacion.current ? { conversacionId: conversacion.current } : {}),
            ...(ficha ? { contexto: ficha.contexto } : {}),
          },
          false,
          "ninguna",
          turnoId,
        );
        if (!r.ok) {
          poner(id, (m) => ({ ...m, error: textoError(r.error.code, r.error.message) }));
        } else {
          const t = r.data as Turno;
          if (t.conversacionId && miGeneracion === generacion.current) {
            // Una conversación archivada no se retoma: el servidor abre otra y el título es el del turno.
            if (t.conversacionId !== conversacion.current)
              setMeta({ titulo: titular(texto), archivada: false });
            conversacion.current = t.conversacionId;
            setConversacionId(t.conversacionId);
          }
          const plan: PlanVista | undefined = t.token
            ? {
                pasos: t.pasos,
                nivel,
                token: t.token,
                siguiente: 0,
                resultados: [],
                estado: "propuesto",
                // Margen de 30 s: el reloj del servidor corre desde antes de que llegue la respuesta.
                vence: Date.now() + VIGENCIA_PLAN_MS - 30_000,
              }
            : undefined;
          poner(id, (m) => ({ ...m, texto: t.texto, ...(plan ? { plan } : {}) }));
        }
      } catch {
        poner(id, (m) => ({ ...m, error: ERROR_RED }));
      } finally {
        ocupado.current = false;
        setTrabajando(false);
      }
    },
    [ficha, modelo, nivel, portal, poner],
  );

  const decidir = useDecision(portal, mensajes, poner, bloqueo);

  const cargar = useCallback(
    (id: string | null, hilo: Mensaje[], datos: MetaConversacion | null = null) => {
      generacion.current += 1;
      conversacion.current = id;
      setConversacionId(id);
      setMeta(datos);
      setFicha(null);
      setMensajes(hilo);
    },
    [],
  );
  const nueva = useCallback(() => cargar(null, []), [cargar]);
  /** Empieza una conversación nueva sobre una ficha (el servidor revalida el acceso en cada turno). */
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
