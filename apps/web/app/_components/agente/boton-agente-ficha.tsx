"use client";

import { Button } from "@opai/ds";
import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { type MouseEvent, useState } from "react";
import { createPortal } from "react-dom";

import type { Contexto } from "./tipos";

const AgenteEnFicha = dynamic(() => import("./agente-en-ficha").then((m) => m.AgenteEnFicha));

/**
 * «Preguntar a OPAI» en la cabecera de una ficha (CAR-335 D5): abre el agente dentro de la ficha, en
 * la ranura que deja `DetailScreen` bajo la cabecera. El código del agente se carga recién al abrirlo.
 */
export function BotonAgenteFicha({ contexto, nombre }: { contexto: Contexto; nombre: string }) {
  const [ranura, setRanura] = useState<Element | null>(null);
  const alternar = (e: MouseEvent<HTMLButtonElement>) => {
    if (ranura) return setRanura(null);
    const lugar = e.currentTarget.closest("[data-detalle]")?.querySelector("[data-ficha-agente]");
    setRanura(lugar ?? null);
  };
  return (
    <>
      <Button variant="secondary" aria-expanded={Boolean(ranura)} onClick={alternar}>
        <Sparkles className="size-4 text-accent" aria-hidden />
        Preguntar a OPAI
      </Button>
      {ranura
        ? createPortal(
            <AgenteEnFicha contexto={contexto} nombre={nombre} onCerrar={() => setRanura(null)} />,
            ranura,
          )
        : null}
    </>
  );
}
