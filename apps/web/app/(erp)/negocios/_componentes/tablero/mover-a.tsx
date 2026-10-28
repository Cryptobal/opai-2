"use client";

import { MoreHorizontal } from "lucide-react";

import { Menu } from "@opai/ds";

import { type EtapaTablero, useMover } from "./use-mover";

/** Etapas a las que se puede mover (todas menos la actual), con la ganada y la perdida marcadas. */
export function itemsMover(
  p: { etapaActual: string; etapas: EtapaTablero[] },
  onSelect: (e: EtapaTablero) => void,
) {
  return p.etapas
    .filter((e) => e.id !== p.etapaActual)
    .map((e, i) => ({
      id: e.id,
      etiqueta:
        e.tipo === "ganada"
          ? `${e.nombre} (ganar)`
          : e.tipo === "perdida"
            ? `${e.nombre} (perder)`
            : e.nombre,
      ...(i === 0 ? { grupo: "Mover a…" } : {}),
      onSelect: () => onSelect(e),
    }));
}

/** «Mover a…» de cada tarjeta: la alternativa accesible (teclado y táctil) al arrastre. */
export function MoverA(p: {
  negocioId: string;
  titulo: string;
  etapaActual: string;
  etapas: EtapaTablero[];
}) {
  const { mover } = useMover();
  return (
    <Menu
      etiqueta={`Mover ${p.titulo} a…`}
      lado="abajo-derecha"
      disparador={<MoreHorizontal className="size-4" aria-hidden />}
      items={itemsMover(p, (e) => void mover(p.negocioId, e))}
    />
  );
}
