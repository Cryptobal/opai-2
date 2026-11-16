"use client";

import { History, Plus } from "lucide-react";
import { useState } from "react";

import { Banda, Button, PanelLateral } from "@opai/ds";

import { BarraModelo } from "./barra-modelo";
import { ChipContextoFicha } from "./chip-contexto-ficha";
import { Compositor } from "./compositor";
import { MenuDelHilo } from "./menu-del-hilo";
import type { SolicitudAgente } from "./abrir-agente";
import { PanelAgenteContenido } from "./panel-agente-contenido";
import { usePanelAgentePedidos } from "./use-panel-agente-pedidos";
import { useAgente } from "./use-agente";
import { useHistorial } from "./use-historial";

/**
 * Panel del agente interno (CAR-120). Cliente de las capacidades `agente.*`: prepara un plan con
 * vistas previas y solo ejecuta lo que la persona confirma aquí. Cada turno queda guardado en su
 * conversación privada (5b); desde el historial se retoma, y aquí se renombra, archiva o borra (5c).
 */
export function PanelAgente({
  abierto,
  onCerrar,
  portal,
  solicitud,
}: {
  abierto: boolean;
  onCerrar: () => void;
  portal: string;
  /** Pedido externo (historial, ⌘K, ficha, URL); `n` cambia con cada pedido. */
  solicitud: (SolicitudAgente & { n: number }) | null;
}) {
  const a = useAgente(portal, abierto);
  const [histEn, setHistEn] = useState<number | null>(null);
  const verHistorial = histEn === (solicitud?.n ?? 0);
  const setVerHistorial = (v: boolean | ((x: boolean) => boolean)) =>
    setHistEn((typeof v === "function" ? v(verHistorial) : v) ? (solicitud?.n ?? 0) : null);
  const h = useHistorial(portal, abierto && verHistorial);
  usePanelAgentePedidos(abierto, solicitud, a, h);
  const volver = () => {
    a.nueva();
    setVerHistorial(false);
  };
  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="OPAI"
      retener={a.hayPlanPendiente}
      acciones={
        <>
          {verHistorial ? null : <MenuDelHilo a={a} h={h} />}
          <Button
            variant="ghost"
            aria-label={verHistorial ? "Volver a la conversación" : "Historial"}
            aria-pressed={verHistorial}
            className="size-11 p-0"
            disabled={a.hayPlanPendiente}
            onClick={() => setVerHistorial((v) => !v)}
          >
            <History className="size-5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            aria-label="Nueva conversación"
            className="size-11 p-0"
            disabled={a.hayPlanPendiente}
            onClick={volver}
          >
            <Plus className="size-5" aria-hidden />
          </Button>
        </>
      }
    >
      {a.modelos && a.modelos.length > 0 ? (
        <BarraModelo
          modelos={a.modelos}
          modelo={a.modelo}
          nivel={a.nivel}
          onModelo={a.setModelo}
          onNivel={a.setNivel}
        />
      ) : null}
      <PanelAgenteContenido
        a={a}
        h={h}
        verHistorial={verHistorial}
        onVerHistorial={(v) => setVerHistorial(v)}
      />
      {a.ficha && !verHistorial ? (
        <ChipContextoFicha etiqueta={a.ficha.etiqueta ?? "esta ficha"} onQuitar={a.quitarFicha} />
      ) : null}
      {typeof navigator !== "undefined" && !navigator.onLine ? (
        <Banda flotante={false} mensaje="Sin conexión. Tu borrador se conserva." />
      ) : null}
      <Compositor
        key={solicitud?.n ?? 0}
        inicial={solicitud?.borrador ?? ""}
        onEnviar={(t) => void a.enviar(t)}
        deshabilitado={!a.modelo || a.trabajando}
      />
      <p className="t-caption flex-none px-3 pb-2 text-center">
        {a.modelo ? `OPAI usa ${a.modelo.modelo}. ` : ""}Revisa el plan antes de confirmar.
      </p>
    </PanelLateral>
  );
}