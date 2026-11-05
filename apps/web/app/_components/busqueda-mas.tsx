"use client";

import { useRouter } from "next/navigation";

import { BusquedaHoja } from "@opai/ds";

import type { AccionCmdK } from "@/lib/navegacion-entradas";
import type { ItemNav } from "@/lib/navegacion";

import { useBusquedaGlobal } from "./use-busqueda-global";

/**
 * Resultados de la búsqueda dentro del menú «Más» del teléfono: el campo vive en la hoja y esta pieza
 * pinta lo mismo que la paleta (misma fuente, mismos grupos y misma acción al elegir). Se descarga
 * recién al tocar el campo.
 */
export default function BusquedaMas({
  q,
  onElegido,
  onVolver,
  epoca,
  acciones,
  nav,
  agente,
}: {
  q: string;
  onElegido: () => void;
  onVolver: () => void;
  epoca: string;
  acciones: AccionCmdK[];
  nav: ItemNav[];
  agente: boolean;
}) {
  const router = useRouter();
  const b = useBusquedaGlobal({ abierto: true, epoca, acciones, nav, agente, router });
  return (
    <BusquedaHoja
      q={q}
      buscar={b.buscar}
      iniciales={b.iniciales}
      alternativa={{ etiqueta: "Volver al menú", onClick: onVolver }}
      onElegir={(it) => {
        onElegido();
        b.elegir(it);
      }}
    />
  );
}
