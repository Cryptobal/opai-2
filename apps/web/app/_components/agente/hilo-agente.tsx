"use client";

import { Banda } from "@opai/ds";
import { Loader2 } from "lucide-react";

import { TarjetaPlan } from "./tarjeta-plan";
import type { Mensaje } from "./tipos";

/** Burbujas del hilo: la persona a la derecha; el agente, con su plan y sus errores, a todo el ancho. */
export function HiloAgente({
  mensajes,
  onDecidir,
}: {
  mensajes: Mensaje[];
  onDecidir: (id: string, aceptar: boolean) => void;
}) {
  return (
    <>
      {mensajes.map((m) => (
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
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
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
            {m.aviso ? <Banda flotante={false} mensaje={m.aviso} className="mt-2" /> : null}
            {m.plan ? <TarjetaPlan plan={m.plan} onDecidir={(ok) => onDecidir(m.id, ok)} /> : null}
          </div>
        </div>
      ))}
    </>
  );
}
