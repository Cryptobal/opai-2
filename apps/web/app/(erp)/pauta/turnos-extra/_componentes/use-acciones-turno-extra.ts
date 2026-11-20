"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import { RUTA_TURNOS_EXTRA, type TurnoExtraFila } from "./tipos";

export function useAccionesTurnoExtra(t: TurnoExtraFila) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [monto, setMonto] = useState(String(t.montoClp));
  const [montoMotivo, setMontoMotivo] = useState("");
  const [confirmar, setConfirmar] = useState<"aprobar" | "rechazar" | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambiaMonto = Number(monto) !== t.montoClp;

  async function aprobar() {
    setOcupado(true);
    setError(null);
    const entrada: Record<string, unknown> = { id: t.id };
    if (cambiaMonto) {
      entrada.montoClp = Number(monto);
      entrada.montoMotivo = montoMotivo.trim();
    }
    const r = await ejecutarCapacidad("erp", "pauta.turnos_extra.aprobar", entrada);
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    avisar.exito("Turno extra aprobado");
    router.push(RUTA_TURNOS_EXTRA);
    router.refresh();
  }

  async function rechazar() {
    setOcupado(true);
    setError(null);
    const r = await ejecutarCapacidad("erp", "pauta.turnos_extra.rechazar", { id: t.id, motivo: motivo.trim() });
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    avisar.exito("Turno extra rechazado");
    setConfirmar(null);
    router.push(RUTA_TURNOS_EXTRA);
    router.refresh();
  }

  return {
    motivo,
    setMotivo,
    monto,
    setMonto,
    montoMotivo,
    setMontoMotivo,
    confirmar,
    setConfirmar,
    ocupado,
    error,
    setError,
    cambiaMonto,
    aprobar,
    rechazar,
  };
}