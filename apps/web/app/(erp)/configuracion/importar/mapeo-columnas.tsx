"use client";

import { Select, Table, Td, Th, Tr } from "@opai/ds";

import type { CampoCatalogo } from "./tipos";

const IGNORAR = "_ignorar";

/**
 * A qué campo va cada columna de la planilla. OPAI propone el mapeo por el nombre del encabezado;
 * aquí se corrige o se ignora una columna. Cada cambio vuelve a simular.
 */
export function MapeoColumnas(p: {
  columnas: string[];
  mapeo: Record<string, string | null>;
  campos: CampoCatalogo[];
  disabled: boolean;
  onCambiar: (columna: string, campo: string | null) => void;
}) {
  const usados = new Set(Object.values(p.mapeo).filter((v): v is string => !!v));
  return (
    <Table>
      <thead>
        <tr>
          <Th>Columna de la planilla</Th>
          <Th>Campo en OPAI</Th>
        </tr>
      </thead>
      <tbody>
        {p.columnas.map((col, i) => {
          const actual = p.mapeo[col] ?? null;
          const opciones = [
            { valor: IGNORAR, etiqueta: "No importar esta columna" },
            ...p.campos
              .filter((c) => c.clave === actual || !usados.has(c.clave))
              .map((c) => ({ valor: c.clave, etiqueta: c.requerido ? `${c.etiqueta} (obligatorio)` : c.etiqueta })),
          ];
          return (
            <Tr key={col}>
              <Td className="whitespace-normal font-medium">{col}</Td>
              <Td className="min-w-56">
                <Select
                  id={`mapeo-${i}`}
                  aria-label={`Campo para la columna ${col}`}
                  valor={actual ?? IGNORAR}
                  onCambiar={(v) => p.onCambiar(col, v === IGNORAR ? null : v)}
                  opciones={opciones}
                  disabled={p.disabled}
                />
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
