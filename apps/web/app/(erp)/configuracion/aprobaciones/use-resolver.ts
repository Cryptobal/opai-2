"use client";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Aprueba o rechaza una o varias aprobaciones, con aviso del resultado. */
export function useResolver() {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function aprobar(ids: string[]) {
    let ok = 0;
    for (const id of ids) if (await ejecutar("core.aprobaciones.aprobar", { id })) ok++;
    if (ok) avisar.exito(ok === 1 ? "Aprobada y ejecutada" : `${ok} aprobadas y ejecutadas`);
    return ok === ids.length;
  }
  async function rechazar(ids: string[], motivo: string) {
    let ok = 0;
    for (const id of ids) if (await ejecutar("core.aprobaciones.rechazar", { id, motivo })) ok++;
    if (ok) avisar.exito(ok === 1 ? "Rechazada" : `${ok} rechazadas`);
    return ok === ids.length;
  }
  return { aprobar, rechazar, pendiente, error };
}
