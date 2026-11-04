"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@opai/ds";

function Fila({ ok, titulo, detalle, accion }: { ok: boolean; titulo: string; detalle?: string; accion?: ReactNode }) {
  const Icono = ok ? CheckCircle2 : AlertTriangle;
  return (
    <li className="flex items-center gap-3 py-3">
      <Icono className={ok ? "size-5 flex-none text-success-fg" : "size-5 flex-none text-danger-fg"} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="t-body-sm font-medium">{titulo}</p>
        {detalle ? <p className="t-caption text-fg-muted">{detalle}</p> : null}
      </div>
      {accion}
    </li>
  );
}

/** «Bloqueos y avisos» del envío (CPQ v4): la mutual sin confirmar bloquea; el margen informa si pasa por aprobación. */
export function EnviarBloqueos({
  mutualPendiente,
  onConfirmarMutual,
  requiereAprobacion,
  margenTexto,
}: {
  mutualPendiente: boolean;
  onConfirmarMutual: () => void;
  requiereAprobacion: boolean;
  /** Solo con `cpq:costos.ver`; sin permiso no se muestran montos ni márgenes. */
  margenTexto: string | null;
}) {
  return (
    <section aria-labelledby="cpq-env-bloqueos">
      <h3 id="cpq-env-bloqueos" className="t-label">
        Bloqueos y avisos
      </h3>
      <ul className="divide-y divide-border">
        {mutualPendiente ? (
          <Fila
            ok={false}
            titulo="Confirma la mutual adicional"
            detalle="Enviar al cliente exige confirmarla."
            accion={
              <Button type="button" variant="secondary" size="md" onClick={onConfirmarMutual}>
                Confirmar
              </Button>
            }
          />
        ) : (
          <Fila ok titulo="Mutual adicional confirmada" />
        )}
        <Fila
          ok={!requiereAprobacion}
          titulo={requiereAprobacion ? "Margen fuera de lo permitido: requiere aprobación" : "Margen dentro de lo permitido"}
          {...(margenTexto ? { detalle: `Margen efectivo ${margenTexto}` } : {})}
        />
      </ul>
    </section>
  );
}
