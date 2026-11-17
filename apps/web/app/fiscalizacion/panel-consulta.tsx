"use client";

import { useState, useTransition } from "react";

import { Button, Input, RowCard } from "@opai/ds";

type Reporte = { tipo: string; titulo: string; descripcion: string };
type Busqueda = {
  encontrado: boolean;
  razonSocial?: string | null;
  rut?: string;
  reportes?: Reporte[];
};

export function PanelConsulta({
  rutInicial,
  buscar,
}: {
  rutInicial: string;
  buscar: (rut: string) => Promise<Busqueda | null>;
}) {
  const [rut, setRut] = useState(rutInicial);
  const [datos, setDatos] = useState<Busqueda | null>(null);
  const [pendiente, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Input label="RUT del empleador" mono value={rut} onChange={(e) => setRut(e.target.value)} />
        </div>
        <Button type="button" disabled={pendiente} onClick={() => start(async () => setDatos(await buscar(rut)))}>
          Buscar
        </Button>
      </div>
      {datos?.encontrado && datos.reportes ? (
        <div className="flex flex-col gap-2">
          <div>
            <p className="t-heading m-0">{datos.razonSocial}</p>
            <p className="t-body-sm muted m-0">{datos.rut}</p>
          </div>
          {datos.reportes.map((r) => (
            <RowCard key={r.tipo} icon="file" title={r.titulo} subtitle={r.descripcion} />
          ))}
        </div>
      ) : datos && !datos.encontrado ? (
        <p className="t-body muted">Sin resultados para ese RUT.</p>
      ) : null}
    </div>
  );
}