"use client";

import type { ReactNode } from "react";

import { Sheet } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useHojaUrl } from "@/app/_components/maestros/use-url";

import type { Evento } from "./datos";

type Props = { e: Evento | null; cuando: string; entidad: string | null };

const json = (v: unknown) => JSON.stringify(v ?? {}, null, 2);

function Par({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-fg-subtle">{etiqueta}</p>
      <div className="text-base text-fg">{children}</div>
    </div>
  );
}

/** Detalle de un evento de auditoría (34): actor, canal, entidad, payload y resultado plegables. */
export function HojaEvento({ e, cuando, entidad }: Props) {
  const hoja = useHojaUrl("ver");
  return (
    <Sheet
      abierto={hoja.abierta && Boolean(e)}
      onCerrar={hoja.cerrar}
      titulo={e?.capability ?? "Evento"}
      descripcion={cuando}
    >
      {e ? (
        <div className="flex flex-col gap-4">
          <Par etiqueta="Actor">
            {e.actor.nombre}
            {e.via ? ` vía ${e.via}` : ""}
          </Par>
          <Par etiqueta="Canal">{e.actor.agente ? "Agente por MCP o API" : "Interfaz de OPAI"}</Par>
          <Par etiqueta="Qué hizo">{e.accion}</Par>
          {e.entidad ? (
            <Par etiqueta="Entidad">
              {entidad ? (
                <LinkNext href={entidad} className="text-accent underline underline-offset-2">
                  Abrir la ficha ({e.entidad.tipo})
                </LinkNext>
              ) : (
                <span className="t-mono text-sm">{`${e.entidad.tipo} · ${e.entidad.id}`}</span>
              )}
            </Par>
          ) : null}
          {[
            ["Payload", e.detalle],
            ["Resultado", e.extra],
          ].map(([t, v]) => (
            <details
              key={String(t)}
              open={t === "Payload"}
              className="group rounded-md border border-border"
            >
              <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-md font-semibold text-fg">
                {String(t)}
              </summary>
              <pre className="t-mono overflow-x-auto border-t border-border bg-fill p-3 text-xs text-fg">
                {json(v)}
              </pre>
            </details>
          ))}
        </div>
      ) : null}
    </Sheet>
  );
}
