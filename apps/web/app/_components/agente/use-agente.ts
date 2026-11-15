"use client";

import { useHiloEstado, type FichaAgente, type MetaConversacion } from "./hilo-estado";
import { useDecision } from "./use-decision";
import { useEnvioAgente } from "./use-envio-agente";
import { useModelos } from "./use-modelos";

export type { FichaAgente, MetaConversacion };

/** Estado del hilo del agente. El servidor guarda cada turno en la conversación de la persona (R19). */
export function useAgente(portal: string, abierto: boolean) {
  const { modelos, errorModelos, modelo, setModelo } = useModelos(portal, abierto);
  const h = useHiloEstado();
  const envio = useEnvioAgente({
    portal,
    abierto,
    modelo,
    nivel: h.nivel,
    ficha: h.ficha,
    conversacionRef: h.conversacionRef,
    generacionRef: h.generacionRef,
    setTrabajando: h.setTrabajando,
    setMensajes: h.setMensajes,
    poner: h.poner,
    alConversacion: h.alConversacion,
  });
  const decidir = useDecision(portal, h.mensajes, h.poner, envio.bloqueo);
  const cargar = (id: string | null, hilo: Parameters<typeof h.cargar>[1], datos?: MetaConversacion | null) =>
    h.cargar(id, hilo, datos ?? null, envio.resetPendiente);
  return {
    modelos,
    errorModelos,
    modelo,
    setModelo,
    nivel: h.nivel,
    setNivel: h.setNivel,
    mensajes: h.mensajes,
    trabajando: h.trabajando,
    enviar: envio.enviar,
    decidir,
    nueva: () => cargar(null, []),
    cargar,
    conversacionId: h.conversacionId,
    meta: h.meta,
    setMeta: h.setMeta,
    ficha: h.ficha,
    quitarFicha: () => h.setFicha(null),
    sobreFicha: (f: FichaAgente) => {
      cargar(null, []);
      h.setFicha(f);
    },
    hayPlanPendiente: h.mensajes.some(
      (m) =>
        m.plan &&
        (m.plan.estado === "propuesto" ||
          m.plan.estado === "en_curso" ||
          m.plan.estado === "ejecutando"),
    ),
  };
}
