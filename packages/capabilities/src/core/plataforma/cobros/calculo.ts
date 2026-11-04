import {
  aClp,
  cargoDelMes,
  limitesDelPeriodo,
  MOTIVOS_COBRO,
  type CondicionCobro,
} from "@opai/domain";
import type { NuevoCargoCobro } from "@opai/db";

import { listarModulos } from "../../../module";
import { aFecha } from "../../maestros/comun";
import type { CondicionVista } from "./esquemas";

/** UF publicada a un día: centavos de CLP y el día desde el que rige. */
export type UfDelDia = { centavos: number; desde: Date } | null;

export const periodoDe = (fecha: string) => fecha.slice(0, 7);
export const aFechaPeriodo = (periodo: string) => aFecha(`${periodo}-01`);

/** Mes anterior a un período aaaa-mm. */
export function periodoAnterior(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * UF para convertir un mes: la del último día del mes. `exacta` es false si aún no está publicada
 * para ese día y se usa la última anterior (solo sirve para estimar, nunca para un cargo).
 */
export async function ufDelPeriodo(periodo: string, buscar: (d: Date) => Promise<UfDelDia>) {
  const { fin } = limitesDelPeriodo(periodo);
  const uf = await buscar(aFecha(fin));
  if (!uf) return null;
  return { centavos: uf.centavos, exacta: uf.desde.toISOString().slice(0, 10) === fin };
}

/** Módulos que se pueden cobrar: los registrados, sin el núcleo. */
export const modulosCobrables = () =>
  listarModulos()
    .filter((m) => m.id !== "core")
    .map((m) => ({ id: m.id, nombre: m.nombre }));

const aCondicion = (c: CondicionVista): CondicionCobro => ({
  moneda: c.moneda,
  precioMensual: c.precioMensual,
  cobroDesde: c.cobroDesde,
  pruebaHasta: c.pruebaHasta,
  descuentoPct: c.descuentoPct,
});

/** Estado de cobro de cada módulo de una empresa en un mes. */
export function filasDeCobro(
  condiciones: ReadonlyMap<string, CondicionVista>,
  estados: ReadonlyMap<string, string>,
  periodo: string,
  ufCentavos: number | null,
) {
  return modulosCobrables().map((m) => {
    const condicion = condiciones.get(m.id) ?? null;
    const estado = estados.get(m.id) ?? null;
    const r = cargoDelMes(condicion ? aCondicion(condicion) : null, estado, periodo);
    const montoClp = r.facturable && condicion ? aClp(r.monto, condicion.moneda, ufCentavos) : null;
    return {
      moduloId: m.id,
      nombre: m.nombre,
      estado,
      condicion,
      calculo: {
        facturable: r.facturable,
        motivo: r.motivo,
        motivoTexto: MOTIVOS_COBRO[r.motivo],
        desde: r.desde,
        diasCobrados: r.diasCobrados,
        diasMes: r.diasMes,
        monto: r.monto,
        montoClp,
      },
    };
  });
}

export type FilaCobro = ReturnType<typeof filasDeCobro>[number];

/**
 * Cargos nuevos de un mes cerrado: los que se facturan, con UF exacta si son en UF, y sin un cargo
 * vigente del mismo módulo y mes. Lo demás vuelve en `omitidos` con su motivo.
 */
export function cargosPorGenerar(
  filas: readonly FilaCobro[],
  periodo: string,
  ufCentavos: number | null,
  yaGenerados: ReadonlySet<string>,
) {
  const nuevos: NuevoCargoCobro[] = [];
  const omitidos: { moduloId: string; motivo: string }[] = [];
  for (const f of filas) {
    if (!f.condicion) continue;
    if (yaGenerados.has(f.moduloId)) omitidos.push({ moduloId: f.moduloId, motivo: "Ya generado" });
    else if (!f.calculo.facturable)
      omitidos.push({ moduloId: f.moduloId, motivo: f.calculo.motivoTexto });
    else if (f.calculo.montoClp === null)
      omitidos.push({ moduloId: f.moduloId, motivo: "Sin UF publicada del último día del mes" });
    else
      nuevos.push({
        moduloId: f.moduloId,
        periodo: aFechaPeriodo(periodo),
        moneda: f.condicion.moneda,
        precioMensual: f.condicion.precioMensual,
        descuentoPct: f.condicion.descuentoPct,
        diasCobrados: f.calculo.diasCobrados,
        diasMes: f.calculo.diasMes,
        monto: f.calculo.monto,
        ufCentavos: f.condicion.moneda === "UF" ? ufCentavos : null,
        montoClp: f.calculo.montoClp,
      });
  }
  return { nuevos, omitidos };
}
