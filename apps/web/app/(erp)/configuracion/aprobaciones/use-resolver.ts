"use client";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/**
 * Aprueba o rechaza una o varias aprobaciones, con aviso del resultado. Las de `dePlataforma` van
 * por `platform.aprobaciones.*` (CAR-36): su auditoría no queda en la empresa.
 */
export function useResolver(dePlataforma: ReadonlySet<string> = new Set()) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  // Ids literales por llamada: el gate de paridad los verifica contra el registro.
  const aprobarUna = (id: string) =>
    dePlataforma.has(id)
      ? ejecutar("platform.aprobaciones.aprobar", { id })
      : ejecutar("core.aprobaciones.aprobar", { id });
  const rechazarUna = (id: string, motivo: string) =>
    dePlataforma.has(id)
      ? ejecutar("platform.aprobaciones.rechazar", { id, motivo })
      : ejecutar("core.aprobaciones.rechazar", { id, motivo });
  async function aprobar(ids: string[]) {
    let ok = 0;
    for (const id of ids) if (await aprobarUna(id)) ok++;
    if (ok) avisar.exito(ok === 1 ? "Aprobada y ejecutada" : `${ok} aprobadas y ejecutadas`);
    return ok === ids.length;
  }
  async function rechazar(ids: string[], motivo: string) {
    let ok = 0;
    for (const id of ids) if (await rechazarUna(id, motivo)) ok++;
    if (ok) avisar.exito(ok === 1 ? "Rechazada" : `${ok} rechazadas`);
    return ok === ids.length;
  }
  return { aprobar, rechazar, pendiente, error };
}
