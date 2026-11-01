"use client";

import { ChevronLeft, ChevronRight, History } from "lucide-react";

import { Button, ChipToggle, InputFecha, Select } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

import { claveMes, mesVecino, nombreMes } from "./etiquetas";
import type { OpcionInstalacion } from "./tipos";

type Props = {
  instalaciones: readonly OpcionInstalacion[];
  inst: string | null;
  anio: number;
  mes: number;
  verPpc: boolean;
  diaria: boolean;
  fecha: string;
};

/** Selector de instalación y de mes, filtro «Sin cubrir» y acceso al historial (todo en la URL). */
export function BarraPauta({ instalaciones, inst, anio, mes, verPpc, diaria, fecha }: Props) {
  const { fijar } = useParametros();
  const irA = (delta: number) => {
    const m = mesVecino(anio, mes, delta);
    fijar({ mes: claveMes(m.anio, m.mes), dia: null, serie: null });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label="Vistas de pauta" className="flex w-full gap-2">
        <Button variant={diaria ? "secondary" : "primary"} aria-current={!diaria ? "page" : undefined} onClick={() => fijar({ vista: null, ver: null, dia: null })}>Mensual</Button>
        <Button variant={diaria ? "primary" : "secondary"} aria-current={diaria ? "page" : undefined} onClick={() => fijar({ vista: "diaria", ver: null, dia: null })}>Diaria</Button>
      </nav>
      <Select
        aria-label="Instalación"
        className="w-full sm:w-64"
        valor={inst ?? "todas"}
        onCambiar={(v) => fijar({ inst: v === "todas" ? null : v, dia: null, serie: null })}
        opciones={[
          { valor: "todas", etiqueta: "Todas las instalaciones" },
          ...instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
        ]}
      />
      {diaria ? <InputFecha aria-label="Fecha de la pauta" className="w-48" valor={fecha} onCambiar={(v) => { if (v) fijar({ fecha: v, dia: null }); }} /> : <div className="flex items-center gap-1">
        <Button variant="ghost" size="iconSm" aria-label="Mes anterior" onClick={() => irA(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="t-label min-w-36 text-center first-letter:uppercase" aria-live="polite">
          {nombreMes(anio, mes)}
        </span>
        <Button variant="ghost" size="iconSm" aria-label="Mes siguiente" onClick={() => irA(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>}
      <ChipToggle
        etiqueta="Sin cubrir"
        activo={verPpc}
        onCambiar={(a) => fijar({ ver: a ? "ppc" : null })}
      />
      <Button
        variant="secondary"
        className="ml-auto"
        onClick={() => fijar({ historial: "1" })}
      >
        <History className="size-4" aria-hidden /> Historial
      </Button>
    </div>
  );
}
