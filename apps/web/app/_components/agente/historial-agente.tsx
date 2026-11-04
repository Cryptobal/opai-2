"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Empty, Skeleton } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { Resumen } from "./use-historial";

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** Conversaciones guardadas de la persona (R19): abrir retoma el hilo; borrar pide confirmar. */
export function HistorialAgente({
  lista,
  error,
  onAbrir,
  onBorrar,
}: {
  lista: Resumen[] | null;
  error: string | null;
  onAbrir: (id: string) => void;
  onBorrar: (id: string) => void;
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  if (lista === null && !error) return <Skeleton className="h-24 w-full" />;
  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p role="alert" className="t-caption text-danger-fg">
          {error}
        </p>
      ) : null}
      {lista?.length === 0 ? (
        <Empty
          titulo="Aún no tienes conversaciones"
          descripcion="Tus conversaciones con OPAI se guardan aquí, solo para ti, durante 90 días."
        />
      ) : null}
      {lista?.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-1 rounded-lg border border-border bg-surface"
        >
          <Button
            variant="ghost"
            className="h-auto min-h-11 min-w-0 flex-1 flex-col items-start gap-0 px-3 py-2 text-left"
            onClick={() => onAbrir(c.id)}
          >
            <span className="text-md w-full truncate font-medium text-fg">{c.titulo}</span>
            <span className="t-caption">
              {fecha(c.ultimaActividad)} · {c.mensajes} mensajes
            </span>
          </Button>
          {confirmando === c.id ? (
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmando(null);
                onBorrar(c.id);
              }}
            >
              Borrar
            </Button>
          ) : (
            <Button
              variant="ghost"
              aria-label={`Borrar la conversación ${c.titulo}`}
              className="size-11 p-0"
              onClick={() => setConfirmando(c.id)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      ))}
      <EnlaceBoton href="/agente/historial" variante="secondary">
        Ver todo el historial
      </EnlaceBoton>
    </div>
  );
}
