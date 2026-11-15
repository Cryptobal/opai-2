"use client";

import { Banda } from "@opai/ds";
import { Loader2 } from "lucide-react";

import { debeDibujarFichas, fichasVisibles, textoRespaldoFichas } from "./fichas";
import { TarjetaEntidad } from "./tarjeta-entidad";
import { TarjetaPlan } from "./tarjeta-plan";
import { TextoRespuesta } from "./texto-respuesta";
import type { Mensaje } from "./tipos";

/** Pedido del turno: el mensaje «yo» inmediatamente anterior. */
function pedidoDe(mensajes: Mensaje[], indice: number): string {
  for (let i = indice - 1; i >= 0; i--) {
    if (mensajes[i]?.rol === "yo") return mensajes[i]!.texto;
  }
  return "";
}

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
      {mensajes.map((m, i) => {
        const refs = m.referencias ?? [];
        const pedido = pedidoDe(mensajes, i);
        const modoFicha = m.rol === "agente" && debeDibujarFichas(pedido, refs);
        const cards = m.rol === "agente" ? fichasVisibles(pedido, refs) : [];
        const texto =
          m.rol === "agente" && modoFicha ? textoRespaldoFichas(m.texto, cards) : m.texto;
        const preparando = m.rol === "agente" && m.texto === "" && !m.error;
        return (
          <div key={m.id} className={m.rol === "yo" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.rol === "yo"
                  ? "max-w-[85%] rounded-lg bg-accent-muted px-3 py-2"
                  : "w-full rounded-lg bg-surface px-3 py-2"
              }
            >
              {preparando ? (
                <p className="t-caption flex items-center gap-2" role="status">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                  Preparando…
                </p>
              ) : null}
              {m.rol === "agente" && !preparando && modoFicha && cards.length ? (
                <div className="flex flex-col gap-2">
                  {cards.map((r) => (
                    <TarjetaEntidad key={`${r.href}:${r.id}`} entidad={r} />
                  ))}
                </div>
              ) : null}
              {m.rol === "agente" && !preparando && texto ? (
                <div className={modoFicha && cards.length ? "mt-2" : undefined}>
                  <TextoRespuesta texto={texto} referencias={refs} />
                </div>
              ) : null}
              {m.rol === "yo" ? (
                <p className="text-md break-words whitespace-pre-wrap text-fg">{m.texto}</p>
              ) : null}
              {m.rol === "agente" && !preparando && !modoFicha && cards.length ? (
                <div className="mt-2 flex flex-col gap-2">
                  {cards.map((r) => (
                    <TarjetaEntidad key={`${r.href}:${r.id}`} entidad={r} />
                  ))}
                </div>
              ) : null}
              {m.error ? (
                <p role="alert" className="t-caption text-danger-fg">
                  {m.error}
                </p>
              ) : null}
              {m.aviso ? <Banda flotante={false} mensaje={m.aviso} className="mt-2" /> : null}
              {m.plan ? <TarjetaPlan plan={m.plan} onDecidir={(ok) => onDecidir(m.id, ok)} /> : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
