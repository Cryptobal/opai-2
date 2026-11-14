"use client";

import { useMemo, useState } from "react";

import { Checkbox, Input } from "@opai/ds";

import type { EventoCatalogo } from "./datos";

/** «core.cuenta.creada» → «core.cuenta»: los eventos se agrupan por entidad. */
const grupoDe = (id: string) => id.split(".").slice(0, 2).join(".");

/** Elegir eventos del catálogo, con búsqueda y agrupados por entidad (CAR-352). */
export function SelectorEventos({
  catalogo,
  elegidos,
  onCambiar,
}: {
  catalogo: EventoCatalogo[];
  elegidos: string[];
  onCambiar: (eventos: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const grupos = useMemo(() => {
    const t = q.trim().toLowerCase();
    const filtrados = catalogo.filter(
      (e) => !t || e.id.includes(t) || e.descripcion.toLowerCase().includes(t),
    );
    const mapa = new Map<string, EventoCatalogo[]>();
    for (const e of filtrados) mapa.set(grupoDe(e.id), [...(mapa.get(grupoDe(e.id)) ?? []), e]);
    return [...mapa.entries()];
  }, [catalogo, q]);
  const marcar = (id: string, si: boolean) =>
    onCambiar(si ? [...new Set([...elegidos, id])] : elegidos.filter((e) => e !== id));
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar evento (cuenta, persona, documento…)"
        aria-label="Buscar evento"
      />
      <p className="t-caption">
        {elegidos.length === 1 ? "1 evento elegido" : `${elegidos.length} eventos elegidos`}
      </p>
      <div className="flex max-h-80 flex-col gap-4 overflow-y-auto rounded-md border border-border p-3">
        {grupos.length === 0 ? <p className="t-caption">Ningún evento coincide.</p> : null}
        {grupos.map(([grupo, eventos]) => (
          <fieldset key={grupo} className="flex flex-col gap-1">
            <legend className="t-label mb-1 text-fg-muted">{grupo}</legend>
            {eventos.map((e) => (
              <Checkbox
                key={e.id}
                etiqueta={e.id}
                descripcion={e.descripcion}
                marcado={elegidos.includes(e.id)}
                onCambiar={(si) => marcar(e.id, si)}
              />
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
