"use client";

import { SendHorizontal } from "lucide-react";
import { useState } from "react";

import { Button, Textarea } from "@opai/ds";

const MAXIMO = 6_000;

/** Compositor del agente: Enter envía en iPad y escritorio; en el teléfono, Enter es salto de línea. */
export function Compositor({
  onEnviar,
  deshabilitado,
}: {
  onEnviar: (texto: string) => void;
  deshabilitado: boolean;
}) {
  const [texto, setTexto] = useState("");
  const enviar = () => {
    const t = texto.trim();
    if (!t || deshabilitado) return;
    setTexto("");
    onEnviar(t);
  };
  return (
    <div className="flex flex-none items-end gap-2 border-t border-border p-3">
      <Textarea
        aria-label="Mensaje para OPAI"
        placeholder="Escribe lo que necesitas…"
        rows={1}
        maxLength={MAXIMO}
        className="max-h-40 min-h-11 flex-1 resize-none"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) {
            e.preventDefault();
            enviar();
          }
        }}
      />
      <Button
        aria-label="Enviar"
        className="size-11 flex-none p-0"
        disabled={deshabilitado || texto.trim() === ""}
        onClick={enviar}
      >
        <SendHorizontal className="size-5" aria-hidden />
      </Button>
      {texto.length > MAXIMO - 500 ? (
        <span className="t-caption absolute right-4 bottom-1" aria-live="polite">
          {texto.length}/{MAXIMO}
        </span>
      ) : null}
    </div>
  );
}
