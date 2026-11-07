"use client";

import { useState } from "react";

import { Alerta, Button, Empty } from "@opai/ds";

import { encolarHecho } from "@/lib/terreno/cola";

export type EnSitio = {
  id: string;
  clave: string;
  nombre: string;
  empresa: string | null;
  tipoRegistro: string;
  documento: string;
  entradaEn: string;
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

/** Quiénes siguen dentro (lo que el servidor ya tiene) con su botón «Registrar salida» (CAR-78 · E4d). */
export function ListaEnSitio({ items, personaId }: { items: EnSitio[]; personaId: string }) {
  const [salidas, setSalidas] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState(false);

  const salir = async (clave: string) => {
    setError(false);
    try {
      await encolarHecho({ tipo: "acceso.salida", payload: { entradaClave: clave }, personaId });
      setSalidas((s) => new Set(s).add(clave));
    } catch {
      setError(true);
    }
  };
  return (
    <section aria-label="En sitio" className="flex flex-col gap-2">
      <h2 className="t-heading text-fg">En sitio ({items.length})</h2>
      {error ? (
        <Alerta tono="danger" titulo="No se pudo guardar la salida">
          No quedó en el teléfono. Vuelve a intentarlo.
        </Alerta>
      ) : null}
      {items.length === 0 ? (
        <Empty
          titulo="Nadie en sitio"
          descripcion="Las entradas aparecen aquí cuando el servidor las recibe."
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base text-fg">{r.nombre}</span>
                <span className="text-sm text-fg-muted">
                  {r.documento} · desde {hora(r.entradaEn)}
                  {r.empresa ? ` · ${r.empresa}` : ""}
                </span>
              </span>
              {salidas.has(r.clave) ? (
                <span className="text-sm text-fg-muted">Salida guardada</span>
              ) : (
                <Button variant="secondary" onClick={() => void salir(r.clave)}>
                  Registrar salida
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
