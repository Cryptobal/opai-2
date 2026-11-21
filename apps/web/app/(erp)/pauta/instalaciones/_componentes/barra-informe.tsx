"use client";

import { Download } from "lucide-react";

import { Button, Select } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

import { claveMes } from "../../_componentes/etiquetas";
import { useMesInforme } from "../../_componentes/use-mes-informe";
import { descargarCsvSemicolon } from "../../_componentes/csv-excel";
import { BarraMes } from "../../_componentes/barra-mes";
import type { FilaInforme, Orden } from "./datos";

const OPCIONES_ORDEN: { valor: Orden; etiqueta: string }[] = [
  { valor: "cobertura", etiqueta: "Menor cobertura" },
  { valor: "ppc", etiqueta: "Más turnos por cubrir" },
  { valor: "ausentismo", etiqueta: "Más ausentismo" },
  { valor: "atrasos", etiqueta: "Más atrasos" },
];

const num = (x: number | null) => (x === null ? "" : x.toFixed(1).replace(".", ","));

/** CSV con punto y coma (Excel en español) del mes que se ve en pantalla, sin pedir nada al servidor. */
function descargarCsv(filas: readonly FilaInforme[], anio: number, mes: number) {
  const cab = [
    "Instalación",
    "Cuenta",
    "Puestos",
    "Turnos programados",
    "Cobertura %",
    "Por cubrir",
    "Refuerzos",
    "Ausentismo %",
    "Atrasos %",
  ];
  descargarCsvSemicolon(`pauta-por-instalacion-${claveMes(anio, mes)}.csv`, [
    cab,
    ...filas.map((f) => [
      f.instalacion,
      f.cuenta,
      f.puestos,
      f.turnosProgramados,
      num(f.cobertura),
      f.ppc,
      f.refuerzos,
      num(f.ausentismo),
      num(f.atrasos),
    ]),
  ]);
}

type Props = { anio: number; mes: number; orden: Orden; filas: readonly FilaInforme[] };

/** Mes, orden y descarga del informe por instalación (todo en la URL salvo la descarga). */
export function BarraInforme({ anio, mes, orden, filas }: Props) {
  const { fijar } = useParametros();
  const irA = useMesInforme(anio, mes);
  return (
    <BarraMes
      anio={anio}
      mes={mes}
      onCambiar={irA}
      extra={
        <>
          <Select
            aria-label="Ordenar por"
            className="w-full sm:w-56"
            valor={orden}
            onCambiar={(v) => fijar({ orden: v === "cobertura" ? null : v })}
            opciones={OPCIONES_ORDEN}
          />
          <Button
            variant="secondary"
            className="w-full sm:ml-auto sm:w-auto"
            disabled={filas.length === 0}
            onClick={() => descargarCsv(filas, anio, mes)}
          >
            <Download className="size-4" aria-hidden />
            Descargar CSV
          </Button>
        </>
      }
    />
  );
}
