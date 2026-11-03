import { costoEmpleadorPorPersona, juegoDeValores, type EntradaCostoEmpleador, type JuegoDeValores } from "@opai/domain";

import type { ProveedorCostoEmpleador } from "../domain/motor/tipos";
import {
  AVISO_MUTUAL_SIN_CONFIRMAR,
  juegoParaFecha,
  mutualAdicionalCalculo,
  mutualAdicionalTenant,
  valoresLegalesTenant,
} from "./valores-legales";

export type LineaPuesto = {
  id: string;
  sueldoBaseClp: number | null;
  patron: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  colacionClp?: number;
  movilizacionClp?: number;
  tipoContrato?: "indefinido" | "plazo_fijo";
};

export {
  AVISO_MUTUAL_SIN_CONFIRMAR,
  juegoParaFecha,
  mutualAdicionalCalculo,
  mutualAdicionalTenant,
  valoresLegalesTenant,
};

/** Entrada de cotización con supuestos M1/D2/D3 (21 días, indemnización imponible, indefinido por defecto). */
export function entradaCostoDesdeLinea(
  sueldoBaseClp: number,
  opts: {
    colacionClp?: number;
    movilizacionClp?: number;
    tipoContrato?: "indefinido" | "plazo_fijo";
    mutualAdicional?: number;
  } = {},
): EntradaCostoEmpleador {
  return {
    sueldo: {
      sueldoBaseClp,
      gratificacion: "legal_25",
      colacionClp: opts.colacionClp ?? 0,
      movilizacionClp: opts.movilizacionClp ?? 0,
      haberes: [],
    },
    contrato: opts.tipoContrato ?? "indefinido",
    afp: "modelo",
    salud: { tipo: "fonasa" },
    jornadaMinutosSemanales: 42 * 60,
    mutualAdicional: opts.mutualAdicional ?? 0,
    provisiones: {
      diasVacacionesCorridosAnuales: 21,
      baseVacaciones: "sin_gratificacion",
      baseIndemnizacion: "imponible",
      mesesAntiguedad: 0,
      probabilidadIndemnizacion: 1_000_000,
    },
  };
}

/** @deprecated Usar entradaCostoDesdeLinea */
export function entradaCostoDesdeSueldo(sueldoBaseClp: number): EntradaCostoEmpleador {
  return entradaCostoDesdeLinea(sueldoBaseClp);
}

export function proveedorDesdeLineas(
  lineas: readonly LineaPuesto[],
  juego: JuegoDeValores | null,
  mutualAdicional: number,
): ProveedorCostoEmpleador {
  const porId = new Map(lineas.map((l) => [l.id, l]));
  return {
    obtener: ({ lineaId }) => {
      if (!juego) return null;
      const l = porId.get(lineaId);
      if (!l?.sueldoBaseClp) return null;
      const r = costoEmpleadorPorPersona(
        entradaCostoDesdeLinea(l.sueldoBaseClp, {
          colacionClp: l.colacionClp ?? 0,
          movilizacionClp: l.movilizacionClp ?? 0,
          tipoContrato: l.tipoContrato ?? "indefinido",
          mutualAdicional,
        }),
        juego,
      );
      return { costoMensualClp: r.costoEmpresaMensualClp, origen: `07e:${r.huellaJuegoDeValores}` };
    },
  };
}

export async function juegoDesdePublicaciones(fecha: string, valores: Parameters<typeof juegoDeValores>[1]) {
  return juegoDeValores(fecha, valores);
}
