"use client";

import { useCallback, useRef } from "react";

import { Campo, Combobox } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Fila = { id: string; codigo: string; titulo: string; cuentaTitulo: string | null };

/** Elige una cotización del tenant para probar la plantilla HTML con datos reales (CAR-584). */
export function SelectorCotizacionVista({
  valor,
  onCambiar,
}: {
  valor: { id: string; etiqueta: string } | null;
  onCambiar: (v: { id: string; etiqueta: string } | null) => void;
}) {
  const { ejecutar } = useCapacidad("erp");
  const vistos = useRef(new Map<string, string>());
  const buscar = useCallback(
    async (q: string) => {
      const r = await ejecutar<{ items: Fila[] }>("cpq.cotizaciones.list", { limite: 40 }, false, "ninguna");
      if (!r) return [{ valor: "__error", etiqueta: "No se pudo cargar la lista" }];
      const t = q.trim().toLowerCase();
      const items = t
        ? r.items.filter(
            (c) =>
              c.codigo.toLowerCase().includes(t) ||
              c.titulo.toLowerCase().includes(t) ||
              (c.cuentaTitulo?.toLowerCase().includes(t) ?? false),
          )
        : r.items;
      if (!items.length) return [{ valor: "__vacio", etiqueta: "Sin resultados" }];
      return items.map((c) => {
        const etiqueta = `${c.codigo} · ${c.titulo}`;
        vistos.current.set(c.id, etiqueta);
        return { valor: c.id, etiqueta, descripcion: c.cuentaTitulo ?? undefined };
      });
    },
    [ejecutar],
  );
  return (
    <Campo etiqueta="Ver con la cotización" htmlFor="vista-cpq">
      <Combobox
        id="vista-cpq"
        placeholder="Elige una cotización"
        buscarPlaceholder="Buscar por código, título o cuenta"
        textoInicial="Escribe para buscar"
        opciones={valor ? [{ valor: valor.id, etiqueta: valor.etiqueta }] : []}
        valor={valor?.id ?? null}
        onBuscar={buscar}
        onCambiar={([id]) => {
          if (!id || id.startsWith("__")) return;
          onCambiar({ id, etiqueta: vistos.current.get(id) ?? id });
        }}
      />
    </Campo>
  );
}