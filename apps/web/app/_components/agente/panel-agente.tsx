"use client";

import { History, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Banda, Button, Empty, PanelLateral, Segmentado, Select, Skeleton } from "@opai/ds";

import { Compositor } from "./compositor";
import { HiloAgente } from "./hilo-agente";
import { HistorialAgente } from "./historial-agente";
import type { Modelo } from "./tipos";
import { useAgente } from "./use-agente";
import { useHistorial } from "./use-historial";

const CLASE = { economica: "económica", estandar: "estándar", potente: "potente" } as const;
const clave = (m: Modelo) => `${m.proveedor}::${m.modelo}`;

/**
 * Panel del agente interno (CAR-120, PR 5a). Cliente de las capacidades `agente.*`: prepara un plan
 * con vistas previas y solo ejecuta lo que la persona confirma aquí. Cada turno queda guardado en
 * su conversación privada (PR 5b); desde el historial se retoma o se borra.
 */
export function PanelAgente({
  abierto,
  onCerrar,
  portal,
}: {
  abierto: boolean;
  onCerrar: () => void;
  portal: string;
}) {
  const a = useAgente(portal, abierto);
  const [verHistorial, setVerHistorial] = useState(false);
  const h = useHistorial(portal, abierto && verHistorial);
  const sinModelos = a.modelos !== null && a.modelos.length === 0;
  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="OPAI"
      retener={a.hayPlanPendiente}
      acciones={
        <>
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
            onClick={() => {
              a.nueva();
              setVerHistorial(false);
            }}
          >
            <Plus className="size-5" aria-hidden />
          </Button>
        </>
      }
    >
      {a.modelos && a.modelos.length > 0 ? (
        <div className="flex flex-none flex-col gap-2 border-b border-border p-3">
          <Select
            aria-label="Modelo"
            valor={a.modelo ? clave(a.modelo) : undefined}
            onCambiar={(v) => a.setModelo(a.modelos?.find((m) => clave(m) === v) ?? null)}
            opciones={a.modelos.map((m) => ({
              valor: clave(m),
              etiqueta: m.modelo,
              descripcion: CLASE[m.clase],
            }))}
          />
          <Segmentado
            etiqueta="Nivel de confirmación"
            activa={a.nivel}
            opciones={[
              {
                id: "paso_a_paso",
                etiqueta: "Paso a paso",
                onClick: () => a.setNivel("paso_a_paso"),
              },
              {
                id: "aprobar_todo",
                etiqueta: "Aprobar todo",
                onClick: () => a.setNivel("aprobar_todo"),
              },
            ]}
          />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3" aria-live="polite">
        {verHistorial ? (
          <HistorialAgente
            lista={h.lista}
            error={h.error}
            onBorrar={(id) => {
              if (id === a.conversacionId) a.nueva();
              void h.borrar(id);
            }}
            onAbrir={(id) =>
              void h.abrir(id).then((hilo) => {
                if (!hilo) return;
                a.cargar(id, hilo);
                setVerHistorial(false);
              })
            }
          />
        ) : a.modelos === null && !a.errorModelos ? (
          <Skeleton className="h-24 w-full" />
        ) : a.errorModelos ? (
          <Empty titulo="No pudimos abrir el agente" descripcion="Reintenta en unos minutos." />
        ) : sinModelos ? (
          <Empty
            titulo="El agente no está disponible ahora en tu empresa"
            descripcion="Avísale a un administrador: falta conectar un modelo de IA en Integraciones."
          />
        ) : a.mensajes.length === 0 ? (
          <Empty
            icono={<Sparkles className="size-5" aria-hidden />}
            titulo="¿En qué te ayudo?"
            descripcion="Pregunta por tus datos o pide un cambio. Antes de escribir algo, te muestro el plan para que lo confirmes."
          />
        ) : (
          <HiloAgente mensajes={a.mensajes} onDecidir={(id, ok) => void a.decidir(id, ok)} />
        )}
      </div>
      {typeof navigator !== "undefined" && !navigator.onLine ? (
        <Banda flotante={false} mensaje="Sin conexión. Tu borrador se conserva." />
      ) : null}
      <Compositor onEnviar={(t) => void a.enviar(t)} deshabilitado={!a.modelo || a.trabajando} />
      <p className="t-caption flex-none px-3 pb-2 text-center">
        {a.modelo ? `OPAI usa ${a.modelo.modelo}. ` : ""}Revisa el plan antes de confirmar.
      </p>
    </PanelLateral>
  );
}
