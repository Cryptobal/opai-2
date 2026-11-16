import { Alerta } from "@opai/ds";

import type { Planilla } from "./datos";

/**
 * El saldo de la planilla parte del saldo del banco de hoy (ADR-073). Avisa cuando ninguna cuenta tiene saldo
 * (la planilla parte en $0, CAR-391) o cuando hay cuentas activas sin saldo, que no suman.
 */
export function AvisoSaldoBanco({ saldoBanco }: { saldoBanco: Planilla["saldoBanco"] }) {
  if (saldoBanco.fuente === "sin_banco") {
    return (
      <Alerta tono="warning" titulo="Todavía no hay saldo del banco">
        Ninguna cuenta bancaria activa tiene saldo, así que la planilla parte en $0. Conecta el banco o carga una cartola
        para ver el saldo real.
      </Alerta>
    );
  }
  if (saldoBanco.cuentasSinSaldo.length === 0) return null;
  return (
    <Alerta tono="warning" titulo={`Sin saldo en cartola para: ${saldoBanco.cuentasSinSaldo.map((c) => c.banco).join(", ")}`}>
      Esas cuentas no suman al saldo del banco con que parte la planilla.
    </Alerta>
  );
}
