"use client";

import { Dialog as RadixDialog } from "radix-ui";
import { useState } from "react";

import { BusquedaHoja } from "./busqueda-hoja";
import type { GrupoPaleta, ItemPaleta } from "./command-palette";
import { HojaMovil } from "./hoja-movil";
import { InputBusqueda } from "./input-busqueda";

/** Texto de ayuda único de la búsqueda del teléfono: el mismo en «Más» y en el ícono de la barra superior. */
export const TEXTO_BUSQUEDA = "Buscar o ir a…";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  buscar: (q: string) => Promise<readonly GrupoPaleta[]>;
  iniciales?: readonly GrupoPaleta[];
  onElegir: (item: ItemPaleta) => void;
};

function Interior({ buscar, iniciales = [], onElegir }: Omit<Props, "abierto" | "onCerrar">) {
  const [q, setQ] = useState("");
  return (
    <>
      <div className="flex flex-none items-center gap-1 py-2 pr-1 pl-4">
        <InputBusqueda
          valor={q}
          onCambiar={setQ}
          placeholder={TEXTO_BUSQUEDA}
          aria-label="Buscar o ir a"
          className="min-w-0 flex-1"
        />
        <RadixDialog.Close className="flex min-h-11 flex-none items-center rounded-md px-3 t-label text-accent outline-none focus-visible:outline-2 focus-visible:outline-focus">
          Cancelar
        </RadixDialog.Close>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[env(safe-area-inset-bottom)]">
        <BusquedaHoja q={q} buscar={buscar} iniciales={iniciales} onElegir={onElegir} />
      </div>
    </>
  );
}

/**
 * La búsqueda del teléfono abierta desde el ícono de la barra superior (CAR-182, lámina 19e): la misma
 * hoja, el mismo campo y el mismo cuerpo que el modo búsqueda del menú «Más». El texto se borra al cerrar.
 */
export function HojaBusqueda({ abierto, onCerrar, ...resto }: Props) {
  return (
    <HojaMovil abierto={abierto} onCerrar={onCerrar} titulo={TEXTO_BUSQUEDA} enfocarCampo>
      <Interior {...resto} />
    </HojaMovil>
  );
}
