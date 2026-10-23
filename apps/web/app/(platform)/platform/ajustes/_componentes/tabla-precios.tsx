"use client";

import { Input, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import type { Precio } from "./tipos";

type Props = {
  precios: Precio[];
  valores: Record<string, string>;
  onCambiar: (recurso: string, texto: string) => void;
  invalidos: Set<string>;
};

/** Precios de recursos (50): lo que se cobra a cada empresa por unidad, en US$. */
export function TablaPrecios({ precios, valores, onCambiar, invalidos }: Props) {
  return (
    <SeccionTarjeta titulo="Precios de recursos" sinRelleno>
      <p className="t-caption px-4 pt-3">
        Lo que se cobra a cada empresa sobre su consumo. Un cambio rige desde hoy.
      </p>
      {precios.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Recurso</Th>
              <Th>Unidad</Th>
              <Th className="text-right">Precio a la empresa</Th>
            </tr>
          </thead>
          <tbody>
            {precios.map((p) => (
              <Tr key={p.recurso}>
                <Td className="t-mono">{p.recurso}</Td>
                <Td>{p.unidad}</Td>
                <Td className="w-40">
                  <Input
                    aria-label={`Precio de ${p.recurso} en US$`}
                    inputMode="decimal"
                    className="t-numeric text-right"
                    value={valores[p.recurso] ?? ""}
                    aria-invalid={invalidos.has(p.recurso) || undefined}
                    onChange={(e) => onCambiar(p.recurso, e.target.value)}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="px-4 py-4 text-base text-fg-muted">
          Sin precios cargados (corre el seed del catálogo).
        </p>
      )}
    </SeccionTarjeta>
  );
}
