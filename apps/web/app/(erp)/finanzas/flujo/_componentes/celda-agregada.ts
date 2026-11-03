import type { CeldaFlujo } from "./datos";

export type CeldaAgregada = {
  monto: number;
  capa: CeldaFlujo["capa"];
  nota: string | null;
  /** Solo hay plan sin respaldo de cartola (semana pasada): no suma al saldo. */
  soloPlanSinRespaldo: boolean;
};

const PESO = { real: 3, comprometido: 2, plan: 1 } as const;

/**
 * Una sola cifra por (fila, semana): en semanas pasadas la cartola trae una celda real por
 * movimiento y la celda muestra su suma (hallazgo 6, CAR-181); el plan pasado sin respaldo no
 * es la cifra principal porque el saldo no lo suma.
 */
export function celdaAgregada(
  celdas: readonly CeldaFlujo[],
  filaId: string,
  semana: string,
  pasada: boolean,
): CeldaAgregada | null {
  const delPar = celdas.filter((c) => c.filaId === filaId && c.semana === semana);
  if (delPar.length === 0) return null;
  const principales = pasada ? delPar.filter((c) => c.capa !== "plan") : delPar;
  if (principales.length === 0) {
    const plan = delPar.reduce((s, c) => s + c.monto, 0);
    return { monto: plan, capa: "plan", nota: null, soloPlanSinRespaldo: true };
  }
  const capa = principales.reduce<CeldaFlujo["capa"]>(
    (m, c) => (PESO[c.capa] > PESO[m] ? c.capa : m),
    "plan",
  );
  return {
    monto: principales.reduce((s, c) => s + c.monto, 0),
    capa,
    nota: principales.length === 1 ? (principales[0]?.nota ?? null) : null,
    soloPlanSinRespaldo: false,
  };
}
