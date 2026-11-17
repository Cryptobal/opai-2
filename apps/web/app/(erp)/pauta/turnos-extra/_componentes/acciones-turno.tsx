"use client";

import { CamposAccionesTurno } from "./campos-acciones-turno";
import { DialogosAccionesTurno } from "./dialogos-acciones-turno";
import type { TurnoExtraFila } from "./tipos";
import { useAccionesTurnoExtra } from "./use-acciones-turno-extra";

/** Aprueba, rechaza o ajusta el monto de un turno extra (CAR-620). */
export function AccionesTurno({ t, puedeAprobar, yoId }: { t: TurnoExtraFila; puedeAprobar: boolean; yoId: string }) {
  const s = useAccionesTurnoExtra(t);
  const propio = t.registradoPor === yoId;
  const editable = puedeAprobar && !propio && t.estado === "por_aprobar";

  if (!editable) {
    return (
      <p className="t-caption text-fg-muted">
        {propio ? "No puedes aprobar un turno que registraste." : t.estado !== "por_aprobar" ? "Este turno ya fue resuelto." : "Sin permiso para aprobar."}
      </p>
    );
  }

  return (
    <>
      <CamposAccionesTurno
        t={t}
        monto={s.monto}
        setMonto={s.setMonto}
        montoMotivo={s.montoMotivo}
        setMontoMotivo={s.setMontoMotivo}
        motivo={s.motivo}
        setMotivo={s.setMotivo}
        error={s.error}
        cambiaMonto={s.cambiaMonto}
        onAprobar={() => s.setConfirmar("aprobar")}
        onRechazar={() => (s.motivo.trim().length < 5 ? s.setError("Escribe el motivo (mín. 5 letras).") : s.setConfirmar("rechazar"))}
      />
      <DialogosAccionesTurno
        confirmar={s.confirmar}
        setConfirmar={s.setConfirmar}
        t={t}
        monto={s.monto}
        ocupado={s.ocupado}
        onAprobar={() => void s.aprobar()}
        onRechazar={() => void s.rechazar()}
      />
    </>
  );
}