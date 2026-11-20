"use client";

import { formatearClp } from "@opai/domain";
import { Button, Dialog } from "@opai/ds";

import type { TurnoExtraFila } from "./tipos";

type Confirmar = "aprobar" | "rechazar" | null;

export function DialogosAccionesTurno(p: {
  confirmar: Confirmar;
  setConfirmar: (v: Confirmar) => void;
  t: TurnoExtraFila;
  monto: string;
  ocupado: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  return (
    <>
      <Dialog
        abierto={p.confirmar === "aprobar"}
        onCerrar={() => p.setConfirmar(null)}
        titulo="¿Aprobar este turno extra?"
        descripcion={`${p.t.personaNombre} · ${formatearClp(Number(p.monto) || 0)}`}
        acciones={
          <>
            <Button variant="secondary" onClick={() => p.setConfirmar(null)} disabled={p.ocupado}>Volver</Button>
            <Button onClick={p.onAprobar} disabled={p.ocupado}>{p.ocupado ? "Guardando…" : "Aprobar"}</Button>
          </>
        }
      >{null}</Dialog>
      <Dialog
        abierto={p.confirmar === "rechazar"}
        onCerrar={() => p.setConfirmar(null)}
        titulo="¿Rechazar este turno extra?"
        descripcion="El rechazo es definitivo."
        acciones={
          <>
            <Button variant="secondary" onClick={() => p.setConfirmar(null)} disabled={p.ocupado}>Volver</Button>
            <Button onClick={p.onRechazar} disabled={p.ocupado}>{p.ocupado ? "Guardando…" : "Rechazar"}</Button>
          </>
        }
      >{null}</Dialog>
    </>
  );
}