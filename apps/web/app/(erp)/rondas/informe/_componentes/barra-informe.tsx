"use client";

import { Download } from "lucide-react";

import { Button } from "@opai/ds";

import { claveMes } from "../../../pauta/_componentes/etiquetas";
import { useMesInforme } from "../../../pauta/_componentes/use-mes-informe";
import { descargarCsvSemicolon } from "../../../pauta/_componentes/csv-excel";
import { BarraMes } from "../../../pauta/_componentes/barra-mes";
import type { FilaInformeRondas } from "./datos";

function descargarCsv(filas: readonly FilaInformeRondas[], anio: number, mes: number) {
  const cab = ["Instalación", "Cuenta", "Realizadas", "Completas", "Incompletas", "Atrasadas", "No realizadas"];
  descargarCsvSemicolon(
    `rondas-cumplimiento-${claveMes(anio, mes)}.csv`,
    [cab, ...filas.map((f) => [f.instalacion, f.cuenta, f.realizadas, f.completadas, f.incompletas, f.atrasadas, f.noRealizadas])],
  );
}

type Props = { anio: number; mes: number; filas: readonly FilaInformeRondas[] };

export function BarraInformeRondas({ anio, mes, filas }: Props) {
  const irA = useMesInforme(anio, mes);
  return (
    <BarraMes
      anio={anio}
      mes={mes}
      onCambiar={irA}
      extra={
        <Button variant="secondary" className="ml-auto" onClick={() => descargarCsv(filas, anio, mes)} disabled={!filas.length}>
          <Download className="size-4" aria-hidden />
          Descargar CSV
        </Button>
      }
    />
  );
}