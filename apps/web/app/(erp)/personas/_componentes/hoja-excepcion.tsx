"use client";
import type { EstructuraVista } from "@/lib/tipos-sueldo";
import { HojaCapa } from "@/app/_components/sueldos/hoja-capa";

export function HojaExcepcion({ personaId, actual, hoy }: {
  personaId: string; actual: EstructuraVista | null; hoy: string; nombre: string;
}) {
  return <HojaCapa nivel="persona" refId={personaId} base={actual} hoy={hoy} param="excepcion" />;
}
