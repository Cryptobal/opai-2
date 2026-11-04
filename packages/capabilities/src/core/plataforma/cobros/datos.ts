import type { FiltroCargos } from "@opai/db";

import { aFechaPeriodo, filasDeCobro, ufDelPeriodo, type UfDelDia } from "./calculo";
import { aCargoVista, aCondicionVista, type FilaCargo, type FilaCondicion } from "./esquemas";

/** Lo que necesita de las operaciones de la empresa (estructural: también sirve una simulación). */
export type OpsCobro = {
  condicionesCobro(): Promise<readonly (FilaCondicion & { moduloId: string })[]>;
  modulos(): Promise<readonly { moduloId: string; estado: string }[]>;
  cargosCobro(f: FiltroCargos, limite: number): Promise<readonly FilaCargo[]>;
};

/**
 * Lo que una empresa factura en un mes: estado de cobro de cada módulo, la UF usada y los cargos
 * vigentes del mes. Lo comparten la vista de Plataforma, la generación de cargos y el trabajo diario.
 */
export async function cobroDeEmpresa(
  e: OpsCobro,
  periodo: string,
  buscarUf: (d: Date) => Promise<UfDelDia>,
  /** Para cargos reales: sin la UF exacta del último día, los montos en UF quedan sin CLP. */
  soloUfExacta = false,
) {
  // En serie: cada operación abre su transacción y el pool es chico (connection_limit=5).
  const condiciones = await e.condicionesCobro();
  const modulos = await e.modulos();
  const cargos = await e.cargosCobro({ periodo: aFechaPeriodo(periodo), estado: "listo" }, 200);
  const uf = await ufDelPeriodo(periodo, buscarUf);
  const porModulo = new Map(condiciones.map((c) => [c.moduloId, aCondicionVista(c)]));
  const estados = new Map(modulos.map((m) => [m.moduloId, m.estado]));
  const ufUsada = uf && (uf.exacta || !soloUfExacta) ? uf.centavos : null;
  const filas = filasDeCobro(porModulo, estados, periodo, ufUsada);
  const vigentes = new Map(cargos.map((c) => [c.moduloId, aCargoVista(c)]));
  return { filas, uf, ufUsada, vigentes };
}
