import { formatearClp } from "@opai/domain";
import { Button, Campo, Input, Textarea } from "@opai/ds";

import type { TurnoExtraFila } from "./tipos";

export function CamposAccionesTurno(p: {
  t: TurnoExtraFila;
  monto: string;
  setMonto: (v: string) => void;
  montoMotivo: string;
  setMontoMotivo: (v: string) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  error: string | null;
  cambiaMonto: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Campo etiqueta="Monto (CLP)" htmlFor="monto-te">
        <Input id="monto-te" inputMode="numeric" value={p.monto} onChange={(e) => p.setMonto(e.target.value.replace(/\D/g, ""))} />
      </Campo>
      {p.cambiaMonto ? (
        <Campo etiqueta="Motivo del cambio de monto" htmlFor="monto-motivo">
          <Input id="monto-motivo" value={p.montoMotivo} onChange={(e) => p.setMontoMotivo(e.target.value)} />
        </Campo>
      ) : (
        <p className="t-caption text-fg-muted">Monto sugerido ({p.t.montoOrigen}): {formatearClp(p.t.montoClp)}</p>
      )}
      <Campo etiqueta="Motivo de rechazo" htmlFor="motivo-te">
        <Textarea id="motivo-te" value={p.motivo} onChange={(e) => p.setMotivo(e.target.value)} />
      </Campo>
      {p.error ? <p role="alert" className="text-base font-medium text-danger-fg">{p.error}</p> : null}
      <div className="flex flex-col gap-2 md:flex-row">
        <Button onClick={p.onAprobar} disabled={p.cambiaMonto && p.montoMotivo.trim().length < 3}>Aprobar</Button>
        <Button variant="secondary" onClick={p.onRechazar}>Rechazar</Button>
      </div>
    </div>
  );
}