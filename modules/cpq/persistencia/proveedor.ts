import {
  costoEmpleadorPorPersona,
  juegoDeValores,
  liquidoABruto,
  type AdministradoraAFP,
  type EntradaCostoEmpleador,
  type JuegoDeValores,
} from "@opai/domain";

import type { ProveedorCostoEmpleador } from "../domain/motor/tipos";
import { huellaLinea } from "./juego-vigente";
import { SUPUESTOS_DEFECTO, type SupuestosTenant } from "./supuestos";
import { juegoParaFecha, valoresLegalesTenant, mutualAdicionalTenant, mutualParaCalculo } from "./valores-legales";

export type LineaPuesto = {
  id: string;
  sueldoBaseClp: number | null;
  patron: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  colacionClp?: number | null | undefined;
  movilizacionClp?: number | null | undefined;
  tipoContrato?: string | null | undefined;
  afp?: string | null | undefined;
  saludTipo?: string | null | undefined;
  saludPlanUf?: number | null | undefined;
  /** "liquido": el sueldo base sale de `liquidoObjetivoClp` con el motor (CampoSueldo). */
  sueldoModo?: string | null | undefined;
  liquidoObjetivoClp?: number | null | undefined;
};

export { juegoParaFecha, mutualAdicionalTenant, mutualParaCalculo, valoresLegalesTenant };

export type OpcionesEntrada = {
  colacionClp?: number;
  movilizacionClp?: number;
  tipoContrato?: "indefinido" | "plazo_fijo";
  mutualAdicional?: number;
  afp?: AdministradoraAFP;
  salud?: EntradaCostoEmpleador["salud"];
};

/** Entrada de cotización con supuestos M1/D2/D3 (21 días, indemnización imponible) y los de la línea. */
export function entradaCostoDesdeLinea(sueldoBaseClp: number, opts: OpcionesEntrada = {}): EntradaCostoEmpleador {
  return {
    sueldo: {
      sueldoBaseClp,
      gratificacion: "legal_25",
      colacionClp: opts.colacionClp ?? 0,
      movilizacionClp: opts.movilizacionClp ?? 0,
      haberes: [],
    },
    contrato: opts.tipoContrato ?? "indefinido",
    afp: opts.afp ?? "modelo",
    salud: opts.salud ?? { tipo: "fonasa" },
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

/** Supuestos efectivos de la línea: lo sobrescrito en la línea o el defecto del tenant. */
export function opcionesDeLinea(l: LineaPuesto, supuestos: SupuestosTenant, mutualAdicional: number): OpcionesEntrada {
  const salud = (l.saludTipo ?? supuestos.salud) === "isapre"
    ? { tipo: "isapre" as const, planUf: l.saludPlanUf ?? 0 }
    : { tipo: "fonasa" as const };
  return {
    colacionClp: l.colacionClp ?? 0,
    movilizacionClp: l.movilizacionClp ?? 0,
    tipoContrato: (l.tipoContrato ?? supuestos.contrato) === "plazo_fijo" ? "plazo_fijo" : "indefinido",
    afp: (l.afp ?? supuestos.afp) as AdministradoraAFP,
    salud,
    mutualAdicional,
  };
}

/**
 * Sueldo base que usa el cálculo: el escrito o, en modo líquido objetivo, el bruto que da ese líquido
 * con el juego legal vigente. Null si falta el dato.
 */
export function sueldoBaseEfectivo(
  l: LineaPuesto,
  juego: JuegoDeValores | null,
  opciones: OpcionesEntrada,
): number | null {
  if (l.sueldoModo === "liquido" && l.liquidoObjetivoClp != null) {
    if (!juego) return l.sueldoBaseClp;
    return liquidoABruto(entradaCostoDesdeLinea(0, opciones), l.liquidoObjetivoClp, juego).sueldoBaseClp;
  }
  return l.sueldoBaseClp;
}

export function proveedorDesdeLineas(
  lineas: readonly LineaPuesto[],
  juego: JuegoDeValores | null,
  mutualAdicional: number | null,
  /** false: la tasa es el 0 % supuesto y la huella lo marca para detectar el cambio al confirmar. */
  mutualConfirmada = true,
  supuestos: SupuestosTenant = SUPUESTOS_DEFECTO,
): ProveedorCostoEmpleador {
  const porId = new Map(lineas.map((l) => [l.id, l]));
  return {
    obtener: ({ lineaId }) => {
      if (!juego || mutualAdicional == null) return null;
      const l = porId.get(lineaId);
      if (!l) return null;
      const opciones = opcionesDeLinea(l, supuestos, mutualAdicional);
      const base = sueldoBaseEfectivo(l, juego, opciones);
      if (!base) return null;
      const r = costoEmpleadorPorPersona(entradaCostoDesdeLinea(base, opciones), juego);
      return { costoMensualClp: r.costoEmpresaMensualClp, origen: huellaLinea(r.huellaJuegoDeValores, mutualConfirmada) };
    },
  };
}

export async function juegoDesdePublicaciones(fecha: string, valores: Parameters<typeof juegoDeValores>[1]) {
  return juegoDeValores(fecha, valores);
}
