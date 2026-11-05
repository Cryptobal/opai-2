"use client";

import { History, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Banda, Button, Empty, PanelLateral, Skeleton } from "@opai/ds";

import { BarraModelo } from "./barra-modelo";
import { Compositor } from "./compositor";
import { HiloAgente } from "./hilo-agente";
import { HistorialAgente } from "./historial-agente";
import { MenuDelHilo } from "./menu-del-hilo";
import type { SolicitudAgente } from "./abrir-agente";
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
  // El historial se muestra hasta que llega un pedido nuevo (retomar o preguntar por una ficha).
  const [histEn, setHistEn] = useState<number | null>(null);
  const verHistorial = histEn === (solicitud?.n ?? 0);
  const setVerHistorial = (v: boolean | ((x: boolean) => boolean)) =>
    setHistEn((typeof v === "function" ? v(verHistorial) : v) ? (solicitud?.n ?? 0) : null);
  const h = useHistorial(portal, abierto && verHistorial);
  const { cargar, sobreFicha } = a;
  const { abrir } = h;
  useEffect(() => {
    if (!solicitud) return;
    const { conversacionId, contexto, etiqueta } = solicitud;
    if (conversacionId) {
      void abrir(conversacionId).then((r) => r && cargar(conversacionId, r.hilo, r.meta));
    } else if (contexto) sobreFicha({ contexto, etiqueta });
  }, [solicitud, abrir, cargar, sobreFicha]);
  const sinModelos = a.modelos !== null && a.modelos.length === 0;
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
            titulo={a.ficha ? "Pregúntame sobre esta ficha" : "¿En qué te ayudo?"}
            descripcion="Pregunta por tus datos o pide un cambio. Antes de escribir algo, te muestro el plan para que lo confirmes."
          />
        ) : (
          <HiloAgente mensajes={a.mensajes} onDecidir={(id, ok) => void a.decidir(id, ok)} />
        )}
      </div>
      {a.ficha && !verHistorial ? (
        <p className="t-caption flex flex-none items-center justify-between gap-2 border-t border-border px-3 py-1">
          <span className="truncate">Sobre {a.ficha.etiqueta ?? "esta ficha"}</span>
          <Button
            variant="ghost"
            aria-label="Quitar la ficha"
            className="size-11 p-0"
            onClick={a.quitarFicha}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </p>
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
