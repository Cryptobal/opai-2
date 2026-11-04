"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { textoError } from "./mensajes-error";
import {
  type Mensaje,
  type Modelo,
  type Nivel,
  type PlanVista,
  type Resolucion,
  type Turno,
  VIGENCIA_PLAN_MS,
} from "./tipos";

const nuevoId = () => crypto.randomUUID();

/** Estado del hilo del agente: vive en la pantalla; no se guarda nada (conversaciones: PR 5b). */
export function useAgente(portal: string, abierto: boolean) {
  const [modelos, setModelos] = useState<Modelo[] | null>(null);
  const [errorModelos, setErrorModelos] = useState(false);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [nivel, setNivel] = useState<Nivel>("paso_a_paso");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [trabajando, setTrabajando] = useState(false);
  const ocupado = useRef(false);

  useEffect(() => {
    if (!abierto || modelos !== null) return;
    let vivo = true;
    void ejecutarCapacidad(portal, "agente.modelos.list", {}).then((r) => {
      if (!vivo) return;
      if (!r.ok) return setErrorModelos(true);
      const lista = r.data as Modelo[];
      setModelos(lista);
      setModelo((m) => m ?? lista[0] ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [abierto, modelos, portal]);

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
      const r = await ejecutarCapacidad(
        portal,
        "agente.turno.preparar",
        { mensaje: texto, modelo, nivel },
        false,
        "ninguna",
        nuevoId(),
      );
      if (!r.ok) {
        poner(id, (m) => ({ ...m, error: textoError(r.error.code, r.error.message) }));
      } else {
        const t = r.data as Turno;
        const plan: PlanVista | undefined = t.token
          ? {
              pasos: t.pasos,
              nivel,
              token: t.token,
              siguiente: 0,
              resultados: [],
              estado: "propuesto",
              vence: Date.now() + VIGENCIA_PLAN_MS,
            }
          : undefined;
        poner(id, (m) => ({ ...m, texto: t.texto, ...(plan ? { plan } : {}) }));
      }
      ocupado.current = false;
      setTrabajando(false);
    },
    [modelo, nivel, portal, poner],
  );

  const decidir = useCallback(
    async (id: string, aceptar: boolean) => {
      const actual = mensajes.find((m) => m.id === id)?.plan;
      if (!actual?.token || ocupado.current) return;
      ocupado.current = true;
      poner(id, (m) => (m.plan ? { ...m, plan: { ...m.plan, estado: "ejecutando" } } : m));
      const r = await ejecutarCapacidad(
        portal,
        "agente.plan.confirmar",
        { token: actual.token, aceptar },
        false,
        "layout",
        nuevoId(),
      );
      poner(id, (m) => {
        if (!m.plan) return m;
        if (!r.ok) {
          const vencido = r.error.code === "FORBIDDEN";
          const error = vencido
            ? "Este plan ya no está disponible. Pídelo de nuevo."
            : textoError(r.error.code, r.error.message);
          return { ...m, plan: { ...m.plan, estado: vencido ? "vencido" : "propuesto", error } };
        }
        const res = r.data as Resolucion;
        const resultados = [...m.plan.resultados, ...res.resultados];
        const hechos = resultados.filter((x) => x.ok).length;
        const estado = res.estado === "pendiente" ? "en_curso" : res.estado;
        return {
          ...m,
          plan: {
            ...m.plan,
            token: res.siguiente,
            resultados,
            siguiente: hechos,
            estado: estado === "prevista" ? "propuesto" : estado,
          },
        };
      });
      ocupado.current = false;
    },
    [mensajes, poner, portal],
  );

  const nueva = useCallback(() => setMensajes([]), []);
  const hayPlanPendiente = mensajes.some(
    (m) => m.plan && (m.plan.estado === "propuesto" || m.plan.estado === "en_curso"),
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
    hayPlanPendiente,
  };
}
