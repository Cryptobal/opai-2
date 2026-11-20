"use client";

import { Button, InputFecha } from "@opai/ds";

import { nombreMes } from "./etiquetas";

export function SelectorMesPauta(p: {
  diaria: boolean;
  fecha: string;
  anio: number;
  mes: number;
  onFecha: (v: string) => void;
  onMesAnterior: () => void;
  onMesSiguiente: () => void;
}) {
  if (p.diaria) {
    return (
      <InputFecha
        aria-label="Fecha de la pauta"
        className="w-48"
        valor={p.fecha}
        onCambiar={(v) => {
          if (v) p.onFecha(v);
        }}
      />
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="iconSm" aria-label="Mes anterior" onClick={p.onMesAnterior}>
        ‹
      </Button>
      <span className="t-label min-w-36 text-center first-letter:uppercase" aria-live="polite">
        {nombreMes(p.anio, p.mes)}
      </span>
      <Button variant="ghost" size="iconSm" aria-label="Mes siguiente" onClick={p.onMesSiguiente}>
        ›
      </Button>
    </div>
  );
}