"use client";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { useCandidatasMasivo } from "./use-candidatas-masivo";
import { useEnviarLoteMasivo } from "./use-enviar-lote-masivo";

export function useEnvioMasivo(plantillaId: string) {
  const cap = useCapacidad("erp");
  const c = useCandidatasMasivo(plantillaId, cap);
  const e = useEnviarLoteMasivo(plantillaId, cap, c.candidatas, c.setCandidatas, c.seleccion);

  const cargar = async () => {
    await c.cargar();
    e.limpiarResumen();
  };

  return {
    ...c,
    ...e,
    pendiente: cap.pendiente,
    error: cap.error,
    cargar,
  };
}