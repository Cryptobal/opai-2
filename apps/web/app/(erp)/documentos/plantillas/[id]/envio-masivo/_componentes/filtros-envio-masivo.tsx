"use client";

import { Button, Campo, Checkbox, Select } from "@opai/ds";

export type FiltrosEnvioMasivo = { instalacionId: string; cargoId: string; anexoBorrador: boolean };

type Props = {
  filtros: FiltrosEnvioMasivo;
  instalaciones: { id: string; nombre: string }[];
  cargos: { id: string; nombre: string }[];
  pendiente: boolean;
  onCambiar: (f: FiltrosEnvioMasivo) => void;
  onBuscar: () => void;
};

export function FiltrosEnvioMasivo({ filtros, instalaciones, cargos, pendiente, onCambiar, onBuscar }: Props) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Campo etiqueta="Instalación" htmlFor="fil-ins">
          <Select
            id="fil-ins"
            valor={filtros.instalacionId}
            opciones={[
              { valor: "", etiqueta: "Todas" },
              ...instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
            ]}
            onCambiar={(v) => onCambiar({ ...filtros, instalacionId: v })}
          />
        </Campo>
        <Campo etiqueta="Cargo" htmlFor="fil-car">
          <Select
            id="fil-car"
            valor={filtros.cargoId}
            opciones={[
              { valor: "", etiqueta: "Todos" },
              ...cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
            ]}
            onCambiar={(v) => onCambiar({ ...filtros, cargoId: v })}
          />
        </Campo>
        <div className="flex items-end pb-1">
          <Checkbox
            etiqueta="Solo con anexo en borrador"
            marcado={filtros.anexoBorrador}
            onCambiar={(v) => onCambiar({ ...filtros, anexoBorrador: v })}
          />
        </div>
      </div>
      <Button variant="secondary" disabled={pendiente} onClick={onBuscar}>
        {pendiente ? "Buscando…" : "Buscar personas"}
      </Button>
    </>
  );
}