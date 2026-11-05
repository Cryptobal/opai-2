import { Alerta } from "@opai/ds";

import type { Planilla } from "./datos";

/**
 * El saldo de la planilla parte del saldo del banco de hoy (ADR-073). Avisa cuando no hay saldo de banco
 * (se usa el saldo inicial de Configuración) o cuando hay cuentas activas sin saldo, que no suman.
 */
export function AvisoSaldoBanco({ saldoBanco }: { saldoBanco: Planilla["saldoBanco"] }) {
  if (saldoBanco.fuente === "ajustes") {
    return (
      <Alerta tono="warning" titulo="El saldo no parte del banco">
        Ninguna cuenta bancaria activa tiene saldo: la planilla usa el saldo inicial de Configuración. Importa una
        cartola o conecta Web4Leads.
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
