import { Alerta } from "@opai/ds";

import type { Planilla } from "./datos";

/**
 * El saldo de la planilla parte del saldo del banco de hoy (ADR-073). Avisa cuando no hay saldo de banco
 * (se usa el saldo inicial de Configuración) o cuando hay cuentas activas sin saldo, que no suman.
 */
/** Avisos de la proyección: un abono sin conciliar que podría ser el cobro de una factura todavía proyectada. */
export function AvisosProyeccion({ avisos }: { avisos: Planilla["avisos"] }) {
  if (avisos.length === 0) return null;
  return (
    <Alerta tono="warning" titulo={avisos.length === 1 ? avisos[0]!.mensaje : `${avisos.length} posibles cobros ya recibidos`}>
      {avisos.length === 1
        ? "El abono ya está en el saldo del banco y la factura sigue proyectada: concílialo para que no se cuente dos veces."
        : avisos.map((a) => a.mensaje).join(" · ")}
    </Alerta>
  );
}

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
