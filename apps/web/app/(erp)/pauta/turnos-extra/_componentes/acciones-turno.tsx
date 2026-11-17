"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatearClp } from "@opai/domain";
import { avisar, Button, Campo, Dialog, Input, Textarea } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import { RUTA_TURNOS_EXTRA, type TurnoExtraFila } from "./tipos";

/** Aprueba, rechaza o ajusta el monto de un turno extra (CAR-620). */
export function AccionesTurno({ t, puedeAprobar, yoId }: { t: TurnoExtraFila; puedeAprobar: boolean; yoId: string }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [monto, setMonto] = useState(String(t.montoClp));
  const [montoMotivo, setMontoMotivo] = useState("");
  const [confirmar, setConfirmar] = useState<"aprobar" | "rechazar" | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const propio = t.registradoPor === yoId;
  const editable = puedeAprobar && !propio && t.estado === "por_aprobar";
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

  if (!editable) {
    return (
      <p className="t-caption text-fg-muted">
        {propio ? "No puedes aprobar un turno que registraste." : t.estado !== "por_aprobar" ? "Este turno ya fue resuelto." : "Sin permiso para aprobar."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Campo etiqueta="Monto (CLP)" htmlFor="monto-te">
        <Input id="monto-te" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))} />
      </Campo>
      {cambiaMonto ? (
        <Campo etiqueta="Motivo del cambio de monto" htmlFor="monto-motivo">
          <Input id="monto-motivo" value={montoMotivo} onChange={(e) => setMontoMotivo(e.target.value)} />
        </Campo>
      ) : (
        <p className="t-caption text-fg-muted">Monto sugerido ({t.montoOrigen}): {formatearClp(t.montoClp)}</p>
      )}
      <Campo etiqueta="Motivo de rechazo" htmlFor="motivo-te">
        <Textarea id="motivo-te" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
      {error ? <p role="alert" className="text-base font-medium text-danger-fg">{error}</p> : null}
      <div className="flex flex-col gap-2 md:flex-row">
        <Button onClick={() => setConfirmar("aprobar")} disabled={cambiaMonto && montoMotivo.trim().length < 3}>
          Aprobar
        </Button>
        <Button variant="secondary" onClick={() => (motivo.trim().length < 5 ? setError("Escribe el motivo (mín. 5 letras).") : setConfirmar("rechazar"))}>
          Rechazar
        </Button>
      </div>
      <Dialog
        abierto={confirmar === "aprobar"}
        onCerrar={() => setConfirmar(null)}
        titulo="¿Aprobar este turno extra?"
        descripcion={`${t.personaNombre} · ${formatearClp(Number(monto) || 0)}`}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(null)} disabled={ocupado}>Volver</Button>
            <Button onClick={() => void aprobar()} disabled={ocupado}>{ocupado ? "Guardando…" : "Aprobar"}</Button>
          </>
        }
      >{null}</Dialog>
      <Dialog
        abierto={confirmar === "rechazar"}
        onCerrar={() => setConfirmar(null)}
        titulo="¿Rechazar este turno extra?"
        descripcion="El rechazo es definitivo."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(null)} disabled={ocupado}>Volver</Button>
            <Button onClick={() => void rechazar()} disabled={ocupado}>{ocupado ? "Guardando…" : "Rechazar"}</Button>
          </>
        }
      >{null}</Dialog>
    </div>
  );
}