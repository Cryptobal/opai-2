"use client";

import { Button } from "@opai/ds";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";

import { abrirAgente } from "./abrir-agente";
import { useFichaActual } from "./contexto-pantalla-agente";
import type { Contexto } from "./tipos";

/**
 * «Preguntar a OPAI» en la cabecera de una ficha (CAR-547): abre el panel lateral con el contexto
 * de la ficha; ya no hay bloque de agente dentro del detalle (reemplaza CAR-335 D5).
 */
export function BotonAgenteFicha({ contexto, nombre }: { contexto: Contexto; nombre: string }) {
  const ficha = useMemo(
    () => ({ contexto, etiqueta: nombre }),
    [contexto.id, contexto.tipo, nombre],
  );
  useFichaActual(ficha);
  return (
    <Button
      variant="secondary"
      onClick={() => abrirAgente({ contexto, etiqueta: nombre })}
    >
      <Sparkles className="size-4 text-accent" aria-hidden />
      Preguntar a OPAI
    </Button>
  );
}