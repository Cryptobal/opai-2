"use client";

import { formatearNumero } from "@opai/domain";
import { Alerta } from "@opai/ds";

export type FilaVistaCartola = {
  indice: number;
  estado: string;
  motivo: string | null;
  monto: number | null;
  glosa: string | null;
};

export function VistaCartolaPreview({
  aplicados,
  duplicados,
  rechazados,
  filas,
}: {
  aplicados: number;
  duplicados: number;
  rechazados: number;
  filas: FilaVistaCartola[];
}) {
  return (
    <>
      <Alerta tono="info" titulo={`${aplicados} nuevos · ${duplicados} duplicados · ${rechazados} rechazados`} />
      <ul className="max-h-48 overflow-auto text-sm text-fg-muted">
        {filas.slice(0, 40).map((f) => (
          <li key={f.indice} className="border-b border-border py-1">
            Fila {f.indice + 1}: {f.estado}
            {f.monto != null ? ` · ${formatearNumero(f.monto)} CLP` : ""}
            {f.glosa ? ` · ${f.glosa}` : ""}
            {f.motivo ? ` · ${f.motivo}` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}
