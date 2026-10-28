"use client";

import { type DragEvent, type ReactNode, useRef } from "react";

import { type EtapaTablero, useMover } from "./use-mover";

const de = (e: DragEvent, sel: string) =>
  e.target instanceof Element ? e.target.closest<HTMLElement>(sel) : null;

/**
 * Arrastre entre columnas con la API nativa de HTML (sin librerías, ADR-037), por delegación sobre
 * las columnas y tarjetas que renderiza el servidor (`data-etapa`, `data-negocio`). La alternativa
 * accesible es «Mover a…» en cada tarjeta; en táctil (iOS no arrastra) también. Anuncia el resultado
 * en una región viva para lectores de pantalla.
 */
export function ArrastreTablero({
  etapas,
  children,
}: {
  etapas: EtapaTablero[];
  children: ReactNode;
}) {
  const { mover, anuncio } = useMover();
  const origen = useRef<{ negocio: string; etapa: string } | null>(null);
  const marcar = (col: HTMLElement | null) => {
    document.querySelectorAll("[data-sobre]").forEach((c) => {
      if (c !== col) c.removeAttribute("data-sobre");
    });
    col?.setAttribute("data-sobre", "");
  };
  return (
    <div
      className="contents"
      onDragStart={(e) => {
        const card = de(e, "[data-negocio]");
        const col = de(e, "[data-etapa]");
        if (!card || !col) return;
        origen.current = {
          negocio: card.dataset["negocio"] ?? "",
          etapa: col.dataset["etapa"] ?? "",
        };
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", origen.current.negocio);
      }}
      onDragOver={(e) => {
        const col = de(e, "[data-etapa]");
        if (!col || !origen.current) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        marcar(col);
      }}
      onDragEnd={() => {
        marcar(null);
        origen.current = null;
      }}
      onDrop={(e) => {
        const col = de(e, "[data-etapa]");
        const o = origen.current;
        marcar(null);
        origen.current = null;
        if (!col || !o) return;
        e.preventDefault();
        const destino = etapas.find((x) => x.id === col.dataset["etapa"]);
        if (destino && destino.id !== o.etapa) void mover(o.negocio, destino);
      }}
    >
      {children}
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </div>
  );
}
