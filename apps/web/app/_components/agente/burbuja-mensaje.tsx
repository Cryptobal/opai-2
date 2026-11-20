"use client";

import { Banda } from "@opai/ds";
import { Loader2 } from "lucide-react";

import { debeDibujarFichas, fichasVisibles, textoRespaldoFichas } from "./fichas";
import { TarjetaEntidad } from "./tarjeta-entidad";
import { TarjetaPlan } from "./tarjeta-plan";
import { TextoRespuesta } from "./texto-respuesta";
import type { Mensaje } from "./tipos";

export function BurbujaMensaje({
  m,
  pedido,
  onDecidir,
}: {
  m: Mensaje;
  pedido: string;
  onDecidir: (id: string, aceptar: boolean) => void;
}) {
  const refs = m.referencias ?? [];
  const modoFicha = m.rol === "agente" && debeDibujarFichas(pedido, refs);
  const cards = m.rol === "agente" ? fichasVisibles(pedido, refs) : [];
  const texto =
    m.rol === "agente" && modoFicha ? textoRespaldoFichas(m.texto, cards) : m.texto;
  const preparando = m.rol === "agente" && m.texto === "" && !m.error;
  const bloqueFichas =
    m.rol === "agente" && !preparando && cards.length ? (
      <div className={`flex flex-col gap-2${modoFicha ? "" : " mt-2"}`}>
        {cards.map((r) => (
          <TarjetaEntidad key={`${r.href}:${r.id}`} entidad={r} />
        ))}
      </div>
    ) : null;

  return (
    <div className={m.rol === "yo" ? "flex justify-end" : "flex justify-start"}>
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
        {modoFicha ? bloqueFichas : null}
        {m.rol === "agente" && !preparando && texto ? (
          <div className={modoFicha && cards.length ? "mt-2" : undefined}>
            <TextoRespuesta texto={texto} referencias={refs} />
          </div>
        ) : null}
        {m.rol === "yo" ? (
          <p className="text-md break-words whitespace-pre-wrap text-fg">{m.texto}</p>
        ) : null}
        {!modoFicha ? bloqueFichas : null}
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
}