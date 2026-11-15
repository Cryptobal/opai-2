"use client";

import { Download } from "lucide-react";

import { Button, Select } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

import { claveMes, mesVecino, nombreMes } from "../../_componentes/etiquetas";
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
  const celda = (v: string | number) => {
    const t = typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : String(v);
    return `"${t.replaceAll('"', '""')}"`;
  };
  const lineas = [
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
  ];
  const BOM = String.fromCharCode(0xfeff);
  const texto = `${BOM}${lineas.map((l) => l.map(celda).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `pauta-por-instalacion-${claveMes(anio, mes)}.csv`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type Props = { anio: number; mes: number; orden: Orden; filas: readonly FilaInforme[] };

/** Mes, orden y descarga del informe por instalación (todo en la URL salvo la descarga). */
export function BarraInforme({ anio, mes, orden, filas }: Props) {
  const { fijar } = useParametros();
  const irA = (delta: number) => {
    const m = mesVecino(anio, mes, delta);
    fijar({ mes: claveMes(m.anio, m.mes) });
  };
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="iconSm" aria-label="Mes anterior" onClick={() => irA(-1)}>
          ‹
        </Button>
        <span className="t-label min-w-36 text-center first-letter:uppercase" aria-live="polite">
          {nombreMes(anio, mes)}
        </span>
        <Button variant="ghost" size="iconSm" aria-label="Mes siguiente" onClick={() => irA(1)}>
          ›
        </Button>
      </div>
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
    </div>
  );
}
