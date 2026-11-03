"use client";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { esAprobacionCpq } from "@/lib/aprobaciones-cpq";

function refCpq(id: string) {
  if (id.startsWith("cpq-m/")) return { tipo: "margen" as const, ref: id.slice("cpq-m/".length) };
  if (id.startsWith("cpq-e/")) return { tipo: "envio" as const, ref: id.slice("cpq-e/".length) };
  return null;
}

/**
 * Aprueba o rechaza aprobaciones del núcleo, plataforma o CPQ (CAR-141).
 * CPQ delega en las capacidades existentes (#208 / #218); no reimplementa N6.
 */
export function useResolver(dePlataforma: ReadonlySet<string> = new Set()) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const aprobarUna = (id: string) => {
    const cpq = esAprobacionCpq(id) ? refCpq(id) : null;
    if (cpq?.tipo === "margen") return ejecutar("cpq.cotizaciones.aprobar", { id: cpq.ref });
    if (cpq?.tipo === "envio") return ejecutar("cpq.envios_propuesta.aprobar", { envioId: cpq.ref });
    if (dePlataforma.has(id)) return ejecutar("platform.aprobaciones.aprobar", { id });
    return ejecutar("core.aprobaciones.aprobar", { id });
  };
  const rechazarUna = (id: string, motivo: string) => {
    const cpq = esAprobacionCpq(id) ? refCpq(id) : null;
    if (cpq?.tipo === "margen") {
      return ejecutar("cpq.cotizaciones.rechazar_aprobacion", { id: cpq.ref, motivo });
    }
    if (cpq?.tipo === "envio") {
      return ejecutar("cpq.envios_propuesta.cancelar", { envioId: cpq.ref, motivo });
    }
    if (dePlataforma.has(id)) return ejecutar("platform.aprobaciones.rechazar", { id, motivo });
    return ejecutar("core.aprobaciones.rechazar", { id, motivo });
  };
  async function aprobar(ids: string[]) {
    let ok = 0;
    for (const id of ids) if (await aprobarUna(id)) ok++;
    if (ok) {
      avisar.exito(ok === 1 ? "Aprobada" : `${ok} aprobadas`);
      window.dispatchEvent(new Event("opai-bandeja"));
    }
    return ok === ids.length;
  }
  async function rechazar(ids: string[], motivo: string) {
    let ok = 0;
    for (const id of ids) if (await rechazarUna(id, motivo)) ok++;
    if (ok) {
      avisar.exito(ok === 1 ? "Rechazada" : `${ok} rechazadas`);
      window.dispatchEvent(new Event("opai-bandeja"));
    }
    return ok === ids.length;
  }
  return { aprobar, rechazar, pendiente, error };
}
