"use client";

import { Button } from "@opai/ds";

import { preguntasDeFicha } from "./preguntas-ficha";
import type { Contexto } from "./tipos";

/** Preguntas rápidas del panel cuando hay contexto de ficha (antes vivían en el bloque interno). */
export function SugerenciasFichaPanel({
  contexto,
  deshabilitado,
  onPreguntar,
}: {
  contexto: Contexto;
  deshabilitado: boolean;
  onPreguntar: (texto: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-3">
      {preguntasDeFicha(contexto.tipo).map((p) => (
        <Button
          key={p}
          variant="secondary"
          className="rounded-full"
          disabled={deshabilitado}
          onClick={() => onPreguntar(p)}
        >
          {p}
        </Button>
      ))}
    </div>
  );
}