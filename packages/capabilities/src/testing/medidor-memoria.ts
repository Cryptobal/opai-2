import { ErrorCapacidad } from "../errores";
import type { AgenteContexto, ConsumoNuevo, Medidor } from "../types";
import type { dbEnMemoria } from "./db-memoria";

/** Mismo contrato de corte y avisos que el medidor real; precios de prueba = cero. */
export function medidorEnMemoria(
  tabla: ReturnType<typeof dbEnMemoria>["tabla"],
  usos: ConsumoNuevo[],
  agente?: AgenteContexto | null,
): Medidor {
  const medidor: Medidor = {
    async preparar(c) {
      await medidor.registrar(c);
      const fila = usos.at(-1)!;
      return async (estado) => {
        Object.assign(fila, estado);
      };
    },
    async registrar(c) {
      const tope = agente?.presupuestoMensualMicro;
      if (c.apiKeyId && tope) {
        const inicio = new Date();
        inicio.setUTCDate(1);
        inicio.setUTCHours(0, 0, 0, 0);
        const gastado = tabla("consumo")
          .filter((f) => f["apiKeyId"] === c.apiKeyId && new Date(String(f["createdAt"])) >= inicio)
          .reduce((s, f) => s + BigInt(Number(f["costoTotalMicro"] ?? 0)), 0n);
        for (const umbral of [80, 100]) {
          const tipo = `core.agente.presupuesto_${umbral}`;
          if (
            gastado * 100n >= tope * BigInt(umbral) &&
            !tabla("evento").some((f) => f["tipo"] === tipo)
          )
            tabla("evento").push({ tipo, entidadId: c.apiKeyId, createdAt: new Date() });
        }
        if (gastado >= tope)
          throw new ErrorCapacidad("BUDGET_EXCEEDED", "Presupuesto mensual agotado.");
      }
      usos.push(c);
    },
  };
  return medidor;
}
