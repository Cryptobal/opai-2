import type { NuevoCargoCobro } from "@opai/db";

import { cargosPorGenerar, type UfDelDia } from "./calculo";
import { cobroDeEmpresa, type OpsCobro } from "./datos";

type Ops = OpsCobro & { crearCargosCobro(c: readonly NuevoCargoCobro[]): Promise<number> };

/**
 * Genera (o simula) los cargos de un mes cerrado de una empresa. Idempotente: salta los módulos con
 * cargo vigente del mes y, ante una carrera, el índice único parcial descarta el duplicado. Para los
 * montos en UF exige la UF exacta del último día del mes.
 */
export async function generarCargosDeEmpresa(
  e: Ops,
  periodo: string,
  buscarUf: (d: Date) => Promise<UfDelDia>,
  dryRun: boolean,
) {
  const r = await cobroDeEmpresa(e, periodo, buscarUf, true);
  const { nuevos, omitidos } = cargosPorGenerar(
    r.filas,
    periodo,
    r.ufUsada,
    new Set(r.vigentes.keys()),
  );
  const creados = dryRun ? nuevos.length : await e.crearCargosCobro(nuevos);
  return {
    creados,
    montoClp: nuevos.reduce((s, c) => s + c.montoClp, 0),
    omitidos,
  };
}
