import { costoEmpleadorPorPersona, juegoDeValores, type EntradaCostoEmpleador, type JuegoDeValores } from "@opai/domain";
import type { Contexto } from "@opai/capabilities";

import type { ProveedorCostoEmpleador } from "../domain/motor/tipos";
import { valoresLegalesTenant } from "./valores-legales";

type LineaPuesto = { id: string; sueldoBaseClp: number | null; patron: string | null; horaInicio: string | null; horaFin: string | null };

/** Juego legal congelado; null si faltan publicaciones (sin fixtures M1). */
export async function juegoParaFecha(ctx: Contexto, fecha: string): Promise<JuegoDeValores | null> {
  const valores = await valoresLegalesTenant(ctx, fecha);
  if (valores.length === 0) return null;
  try {
    return await juegoDeValores(fecha, valores);
  } catch {
    return null;
  }
}

/** Supuestos mínimos de cotización por línea de puesto (no exporta fixtures de prueba M1). */
export function entradaCostoDesdeSueldo(sueldoBaseClp: number): EntradaCostoEmpleador {
  return {
    sueldo: { sueldoBaseClp, gratificacion: "legal_25", colacionClp: 0, movilizacionClp: 0, haberes: [] },
    contrato: "indefinido",
    afp: "modelo",
    salud: { tipo: "fonasa" },
    jornadaMinutosSemanales: 42 * 60,
    mutualAdicional: 0,
    provisiones: {
      diasVacacionesCorridosAnuales: 15,
      baseVacaciones: "imponible",
      baseIndemnizacion: "imponible",
      mesesAntiguedad: 0,
      probabilidadIndemnizacion: 0,
    },
  };
}

export function proveedorDesdeLineas(
  lineas: readonly LineaPuesto[],
  juego: JuegoDeValores | null,
): ProveedorCostoEmpleador {
  const porId = new Map(lineas.map((l) => [l.id, l]));
  return {
    obtener: ({ lineaId }) => {
      if (!juego) return null;
      const l = porId.get(lineaId);
      if (!l?.sueldoBaseClp) return null;
      const r = costoEmpleadorPorPersona(entradaCostoDesdeSueldo(l.sueldoBaseClp), juego);
      return { costoMensualClp: r.costoEmpresaMensualClp, origen: `07e:${r.huellaJuegoDeValores}` };
    },
  };
}
