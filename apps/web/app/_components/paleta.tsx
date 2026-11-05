"use client";

import { useRouter } from "next/navigation";

import { CommandPalette } from "@opai/ds";

import type { AccionCmdK } from "@/lib/navegacion-entradas";
import type { ItemNav } from "@/lib/navegacion";

import { useBusquedaGlobal } from "./use-busqueda-global";

/** Paleta ⌘K del ERP (en teléfono, la hoja de búsqueda): se carga al primer uso. */
export function Paleta({
  abierto,
  onCerrar,
  epoca,
  acciones,
  nav,
  agente = false,
}: {
  abierto: boolean;
  onCerrar: () => void;
  epoca: string;
  acciones: AccionCmdK[];
  nav: ItemNav[];
  /** Hay agente interno disponible: se ofrece «Preguntar a OPAI». */
  agente?: boolean;
}) {
  const router = useRouter();
  const b = useBusquedaGlobal({ abierto, epoca, acciones, nav, agente, router });
  return (
    <CommandPalette
      abierto={abierto}
      onCerrar={() => {
        b.limpiarRecientes();
        onCerrar();
      }}
      buscar={b.buscar}
      iniciales={b.iniciales}
      onElegir={(it) => {
        onCerrar();
        b.elegir(it);
      }}
    />
  );
}
