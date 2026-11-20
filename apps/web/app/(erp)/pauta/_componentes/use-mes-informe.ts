"use client";

import { useParametros } from "@/app/_components/maestros/use-url";

import { claveMes, mesVecino } from "./etiquetas";

export function useMesInforme(anio: number, mes: number): (delta: number) => void {
  const { fijar } = useParametros();
  return (delta) => {
    const m = mesVecino(anio, mes, delta);
    fijar({ mes: claveMes(m.anio, m.mes) });
  };
}