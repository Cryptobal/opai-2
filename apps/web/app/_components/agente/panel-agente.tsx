"use client";

import { Loader2, Plus, Sparkles } from "lucide-react";

import { Banda, Button, Empty, PanelLateral, Segmentado, Select, Skeleton } from "@opai/ds";

import { Compositor } from "./compositor";
import { TarjetaPlan } from "./tarjeta-plan";
import type { Modelo } from "./tipos";
import { useAgente } from "./use-agente";

const CLASE = { economica: "económica", estandar: "estándar", potente: "potente" } as const;
const clave = (m: Modelo) => `${m.proveedor}::${m.modelo}`;

/**
 * Panel del agente interno (CAR-120, PR 5a). Cliente de las capacidades `agente.*`: prepara un plan
 * con vistas previas y solo ejecuta lo que la persona confirma aquí. La conversación vive en la
 * pantalla; guardarla es del PR 5b.
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
  const sinModelos = a.modelos !== null && a.modelos.length === 0;
  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="OPAI"
      retener={a.hayPlanPendiente}
      acciones={
        <Button
          variant="ghost"
          aria-label="Nueva conversación"
          className="size-11 p-0"
          onClick={a.nueva}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
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
        {a.modelos === null && !a.errorModelos ? (
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
          a.mensajes.map((m) => (
            <div key={m.id} className={m.rol === "yo" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.rol === "yo"
                    ? "max-w-[85%] rounded-lg bg-accent-muted px-3 py-2"
                    : "w-full rounded-lg bg-surface px-3 py-2"
                }
              >
                {m.rol === "agente" && m.texto === "" && !m.error ? (
                  <p className="t-caption flex items-center gap-2" role="status">
                    <Loader2
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden
                    />
                    Preparando…
                  </p>
                ) : (
                  <p className="text-md break-words whitespace-pre-wrap text-fg">{m.texto}</p>
                )}
                {m.error ? (
                  <p role="alert" className="t-caption text-danger-fg">
                    {m.error}
                  </p>
                ) : null}
                {m.plan ? (
                  <TarjetaPlan plan={m.plan} onDecidir={(ok) => void a.decidir(m.id, ok)} />
                ) : null}
              </div>
            </div>
          ))
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
