"use client";

import { useCallback, useRef, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { ERROR_RED, ERROR_RED_PLAN, ERROR_VENCIDO, textoError } from "./mensajes-error";
import { aplicarRespuesta } from "./respuesta-plan";
import { useModelos } from "./use-modelos";
import { type Mensaje, type Nivel, type PlanVista, type Turno, VIGENCIA_PLAN_MS } from "./tipos";

const nuevoId = () => crypto.randomUUID();

/** Estado del hilo del agente. El servidor guarda cada turno en la conversación de la persona (R19). */
export function useAgente(portal: string, abierto: boolean) {
  const { modelos, errorModelos, modelo, setModelo } = useModelos(portal, abierto);
  const [nivel, setNivel] = useState<Nivel>("paso_a_paso");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [trabajando, setTrabajando] = useState(false);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const conversacion = useRef<string | null>(null);
  const ocupado = useRef(false);

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
            ...(conversacion.current ? { conversacionId: conversacion.current } : {}),
          },
          false,
          "ninguna",
          nuevoId(),
        );
        if (!r.ok) {
          poner(id, (m) => ({ ...m, error: textoError(r.error.code, r.error.message) }));
        } else {
          const t = r.data as Turno;
          if (t.conversacionId) {
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
    [modelo, nivel, portal, poner],
  );

  const decidir = useCallback(
    async (id: string, aceptar: boolean) => {
      const actual = mensajes.find((m) => m.id === id)?.plan;
      if (!actual?.token || ocupado.current) return;
      if (Date.now() >= actual.vence) {
        return poner(id, (m) =>
          m.plan ? { ...m, plan: { ...m.plan, estado: "vencido", error: ERROR_VENCIDO } } : m,
        );
      }
      ocupado.current = true;
      const previo = actual.estado;
      poner(id, (m) => {
        if (!m.plan) return m;
        const { error: _descartado, ...resto } = m.plan;
        return { ...m, plan: { ...resto, estado: "ejecutando" } };
      });
      try {
        const r = await ejecutarCapacidad(
          portal,
          "agente.plan.confirmar",
          { token: actual.token, aceptar },
          false,
          "layout",
          nuevoId(),
        );
        poner(id, (m) => aplicarRespuesta(m, r, previo));
      } catch {
        // Puede que algún paso ya se haya ejecutado: no se afirma que no pasó nada.
        poner(id, (m) =>
          m.plan ? { ...m, plan: { ...m.plan, estado: previo, error: ERROR_RED_PLAN } } : m,
        );
      } finally {
        ocupado.current = false;
      }
    },
    [mensajes, poner, portal],
  );

  const cargar = useCallback((id: string | null, hilo: Mensaje[]) => {
    conversacion.current = id;
    setConversacionId(id);
    setMensajes(hilo);
  }, []);
  const nueva = useCallback(() => cargar(null, []), [cargar]);
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
    hayPlanPendiente,
  };
}
