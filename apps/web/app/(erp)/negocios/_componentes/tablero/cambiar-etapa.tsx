"use client";

import { ChevronDown } from "lucide-react";

import { Menu } from "@opai/ds";

import { itemsMover } from "./mover-a";
import { type EtapaTablero, useMover } from "./use-mover";

/**
 * Ficha de un negocio abierto (CAR-33): la etapa de la cabecera es un menú para moverlo, con las
 * mismas reglas que el tablero (requisitos en la hoja Mover; ganada y perdida, en sus hojas).
 */
export function CambiarEtapa(p: {
  negocioId: string;
  titulo: string;
  etapaActual: string;
  etapaNombre: string;
  etapas: EtapaTablero[];
}) {
  const { mover } = useMover();
  return (
    <Menu
      etiqueta={`Cambiar etapa de ${p.titulo} (ahora ${p.etapaNombre})`}
      titulo="Cambiar etapa"
      lado="abajo-izquierda"
      claseDisparador="min-h-11 gap-1 border border-border-strong bg-surface px-3 text-sm font-medium text-fg md:min-h-8"
      disparador={
        <>
          {p.etapaNombre}
          <ChevronDown className="size-4 text-fg-subtle" aria-hidden />
        </>
      }
      items={itemsMover(p, (e) => void mover(p.negocioId, e))}
    />
  );
}
