"use client";

import { Sparkles } from "lucide-react";

import { Empty, Skeleton } from "@opai/ds";

import { HiloAgente } from "./hilo-agente";
import { HistorialAgente } from "./historial-agente";
import { SugerenciasFichaPanel } from "./sugerencias-ficha-panel";
import type { useAgente } from "./use-agente";
import type { useHistorial } from "./use-historial";

/** Cuerpo desplazable del panel: historial, estados vacíos o hilo. */
export function PanelAgenteContenido({
  a,
  h,
  verHistorial,
  onVerHistorial,
}: {
  a: ReturnType<typeof useAgente>;
  h: ReturnType<typeof useHistorial>;
  verHistorial: boolean;
  onVerHistorial: (v: boolean) => void;
}) {
  const sinModelos = a.modelos !== null && a.modelos.length === 0;
  return (
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
            void h.abrir(id).then((r) => {
              if (!r) return;
              a.cargar(id, r.hilo, r.meta);
              onVerHistorial(false);
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
        <>
          <Empty
            icono={<Sparkles className="size-5" aria-hidden />}
            titulo={a.ficha ? "Pregúntame sobre esta ficha" : "¿En qué te ayudo?"}
            descripcion="Pregunta por tus datos o pide un cambio. Antes de escribir algo, te muestro el plan para que lo confirmes."
          />
          {a.ficha ? (
            <SugerenciasFichaPanel
              contexto={a.ficha.contexto}
              deshabilitado={!a.modelo || a.trabajando}
              onPreguntar={(t) => void a.enviar(t)}
            />
          ) : null}
        </>
      ) : (
        <HiloAgente mensajes={a.mensajes} onDecidir={(id, ok) => void a.decidir(id, ok)} />
      )}
    </div>
  );
}