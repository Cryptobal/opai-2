"use client";

import type { ReactNode } from "react";

import { NavegacionMes } from "./navegacion-mes";

type Props = { anio: number; mes: number; onCambiar: (delta: number) => void; extra?: ReactNode };

export function BarraMes({ anio, mes, onCambiar, extra }: Props) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <NavegacionMes anio={anio} mes={mes} onCambiar={onCambiar} />
      {extra}
    </div>
  );
}