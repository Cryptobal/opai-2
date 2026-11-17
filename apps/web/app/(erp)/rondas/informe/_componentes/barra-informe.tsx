"use client";

import { Download } from "lucide-react";

import { Button } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

import { claveMes, mesVecino, nombreMes } from "../../../pauta/_componentes/etiquetas";
import type { FilaInformeRondas } from "./datos";

function descargarCsv(filas: readonly FilaInformeRondas[], anio: number, mes: number) {
  const cab = ["Instalación", "Cuenta", "Realizadas", "Completas", "Incompletas", "Atrasadas", "No realizadas"];
  const celda = (v: string | number) => {
    const t = typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : String(v);
    return `"${t.replaceAll('"', '""')}"`;
  };
  const BOM = String.fromCharCode(0xfeff);
  const texto = `${BOM}${[cab, ...filas.map((f) => [f.instalacion, f.cuenta, f.realizadas, f.completadas, f.incompletas, f.atrasadas, f.noRealizadas])]
    .map((l) => l.map(celda).join(";"))
    .join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `rondas-cumplimiento-${claveMes(anio, mes)}.csv`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type Props = { anio: number; mes: number; filas: readonly FilaInformeRondas[] };

export function BarraInformeRondas({ anio, mes, filas }: Props) {
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
      <Button variant="secondary" className="ml-auto" onClick={() => descargarCsv(filas, anio, mes)} disabled={!filas.length}>
        <Download className="size-4" aria-hidden />
        Descargar CSV
      </Button>
    </div>
  );
}