"use client";

import { Button } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { PublicarPauta } from "./publicar-pauta";

export function BarraPautaAccionesInst(p: {
  inst: string;
  anio: number;
  mes: number;
  diaria: boolean;
  puedeEditar: boolean;
  urlExportar: (formato: "excel" | "pdf") => string;
  onAlertas: () => void;
}) {
  return (
    <>
      <EnlaceBoton variante="secondary" href={p.urlExportar("excel")}>CSV</EnlaceBoton>
      <EnlaceBoton variante="secondary" href={p.urlExportar("pdf")}>PDF</EnlaceBoton>
      <Button variant="secondary" onClick={p.onAlertas}>Alertas</Button>
      {!p.diaria && p.puedeEditar ? <PublicarPauta key={`${p.inst}-${p.anio}-${p.mes}`} inst={p.inst} anio={p.anio} mes={p.mes} /> : null}
    </>
  );
}