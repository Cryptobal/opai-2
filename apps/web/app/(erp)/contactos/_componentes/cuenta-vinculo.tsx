"use client";

import { useCallback, useState } from "react";

import { Alerta, Campo, Combobox } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Opcion = { valor: string; etiqueta: string };
type Pagina = { items: { id: string; nombre: string }[] };

/** Busca en el servidor: también encuentra cuentas que no están en la primera página. */
export function CuentaVinculo(p: {
  valor: string;
  onCambiar: (v: string) => void;
  vinculadas: string[];
  disabled: boolean;
}) {
  const [vistas, setVistas] = useState<Opcion[]>([]);
  const [error, setError] = useState(false);
  const buscar = useCallback(
    async (q: string) => {
      try {
        const r = await ejecutarCapacidad("erp", "core.cuentas.list", {
          q: q.trim() || undefined,
          limite: 20,
        });
        setError(!r.ok);
        if (!r.ok) return [];
        const opciones = (r.data as Pagina).items
          .filter((c) => !p.vinculadas.includes(c.id))
          .map((c) => ({ valor: c.id, etiqueta: c.nombre }));
        setVistas((prev) => [
          ...prev,
          ...opciones.filter((o) => !prev.some((v) => v.valor === o.valor)),
        ]);
        return opciones;
      } catch {
        setError(true);
        return [];
      }
    },
    [p.vinculadas],
  );
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alerta
          tono="danger"
          titulo="No pudimos buscar cuentas. Vuelve a escribir para reintentar."
        />
      ) : null}
      <Campo
        etiqueta="Cuenta"
        htmlFor="vinculo-cuenta"
        ayuda="Busca por nombre, razón social o RUT. Se excluyen las cuentas ya vinculadas."
      >
        <Combobox
          id="vinculo-cuenta"
          valor={p.valor}
          onCambiar={([v]) => p.onCambiar(v ?? "")}
          opciones={vistas}
          onBuscar={buscar}
          placeholder="Buscar cuenta"
          disabled={p.disabled}
        />
      </Campo>
    </div>
  );
}
