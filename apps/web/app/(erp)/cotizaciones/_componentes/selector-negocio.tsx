"use client";

import { useCallback, useState } from "react";

import { Campo, Combobox } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

export type NegocioOpcion = { valor: string; etiqueta: string };

/** Búsqueda en servidor: hasta 20 negocios abiertos por consulta; permite afinar por nombre. */
export function SelectorNegocio({
  inicial,
  valor,
  cambiar,
  disabled,
}: {
  inicial: NegocioOpcion | null;
  valor: string | null;
  cambiar: (id: string | null) => void;
  disabled: boolean;
}) {
  const [opciones, setOpciones] = useState<NegocioOpcion[]>(inicial ? [inicial] : []);
  const [error, setError] = useState<string>();
  const buscar = useCallback(async (q: string) => {
    const r = await ejecutarCapacidad("erp", "comercial.negocios.list", {
      q: q.trim() || undefined,
      estado: "abierto",
      limite: 20,
    });
    if (!r.ok) {
      setError(r.error.message);
      return [];
    }
    setError(undefined);
    const filas = (r.data as { items: { id: string; titulo: string; cuentaNombre: string }[] })
      .items;
    const nuevas = filas.map((n) => ({ valor: n.id, etiqueta: `${n.titulo} · ${n.cuentaNombre}` }));
    setOpciones((prev) => [
      ...prev,
      ...nuevas.filter((n) => !prev.some((p) => p.valor === n.valor)),
    ]);
    return nuevas;
  }, []);
  return (
    <Campo
      etiqueta="Negocio abierto"
      htmlFor="cpq-negocio"
      error={error}
      ayuda="Busca por nombre del negocio."
    >
      <Combobox
        id="cpq-negocio"
        opciones={opciones}
        valor={valor}
        onBuscar={buscar}
        onCambiar={([id]) => cambiar(id ?? null)}
        disabled={disabled}
        placeholder="Buscar negocio abierto"
      />
    </Campo>
  );
}
