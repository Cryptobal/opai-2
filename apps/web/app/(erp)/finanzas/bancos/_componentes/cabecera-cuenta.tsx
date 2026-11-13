import type { ReactNode } from "react";

import { fechaHora } from "@/lib/formato";

import { clp } from "../../flujo/_componentes/datos";
import type { CuentaBanco } from "./bancos-tipos";
import { origenSaldo } from "./origen-saldo";

/** Cuenta activa con su saldo de hoy y la última sincronización, y la acción de subir cartola. */
export function CabeceraCuenta({ cuenta, accion }: { cuenta: CuentaBanco | undefined; accion?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="t-body-sm text-fg-muted">
          {cuenta ? `${cuenta.banco} · ${cuenta.numeroVisible}` : "Configura una cuenta para importar cartolas."}
        </p>
        {cuenta?.saldoHoy != null ? (
          <p className="t-body-sm">
            Saldo de hoy <span className="t-mono font-medium">{clp(cuenta.saldoHoy)}</span>
            {origenSaldo(cuenta) ? <span className="text-fg-muted"> · {origenSaldo(cuenta)}</span> : null}
          </p>
        ) : null}
        {cuenta?.ultimaSyncEn ? (
          <p className="t-body-sm text-fg-muted">Sincronizado con el banco el {fechaHora(cuenta.ultimaSyncEn)}</p>
        ) : null}
      </div>
      {accion}
    </div>
  );
}
