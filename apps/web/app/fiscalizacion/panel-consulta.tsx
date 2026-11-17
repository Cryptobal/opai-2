"use client";

import { useState, useTransition } from "react";

import { Button, Campo, Card, Input, TipoArchivo } from "@opai/ds";

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
          <Campo etiqueta="RUT del empleador" htmlFor="rut-empleador">
            <Input id="rut-empleador" className="font-mono" value={rut} onChange={(e) => setRut(e.target.value)} />
          </Campo>
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
            <Card key={r.tipo} className="flex gap-3 p-4">
              <TipoArchivo nombre={`${r.titulo}.pdf`} mime="application/pdf" />
              <div className="min-w-0">
                <p className="t-subheading m-0">{r.titulo}</p>
                <p className="t-body-sm muted m-0 mt-0.5">{r.descripcion}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : datos && !datos.encontrado ? (
        <p className="t-body muted">Sin resultados para ese RUT.</p>
      ) : null}
    </div>
  );
}