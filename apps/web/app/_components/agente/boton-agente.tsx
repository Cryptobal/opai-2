"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@opai/ds";

/** Lanzador del agente, a la izquierda de la campana (spec agente §3.1). Solo existe con licencia y permiso. */
export function BotonAgente({ abierto, onAlternar }: { abierto: boolean; onAlternar: () => void }) {
  return (
    <Button
      variant="ghost"
      className="size-11 flex-none p-0"
      aria-label="Preguntar a OPAI"
      aria-haspopup="dialog"
      aria-expanded={abierto}
      title="Preguntar a OPAI (Ctrl+J)"
      onClick={onAlternar}
    >
      <Sparkles className="size-5" aria-hidden />
    </Button>
  );
}
