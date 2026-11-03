import type { CostoLineaFicha } from "../persistencia/costo-puesto-ficha";

type Fila = {
  id: string; tipo: string; grupo: string | null; nombre: string; posiciones: number; recurrencia: string;
  habilitada: boolean; patron: string | null; horaInicio: string | null; horaFin: string | null;
  diasCobertura: number | null; diasSemana: number[]; sueldoBaseClp: number | null; itemCodigo: string | null;
  cantidadEscalada: number | null; precioUnitarioClp: number | null; huellaJuegoValores: string | null;
  cargoId: string | null; sueldoOrigen: string | null; sueldoModo: string; liquidoObjetivoClp: number | null;
  colacionClp: number | null; movilizacionClp: number | null; afp: string | null; saludTipo: string | null;
  saludPlanUf: number | null; tipoContrato: string | null;
  personasPorPosicionEscaladas: number | null; personasMotivo: string | null;
};

/** Línea de la ficha. Sueldo, colación, movilización y costo solo con `cpq:costos.ver` (R59). */
export function lineaDeFicha(l: Fila, verCostos: boolean, costo: CostoLineaFicha | undefined) {
  return {
    id: l.id, tipo: l.tipo, grupo: l.grupo, nombre: l.nombre, posiciones: l.posiciones, recurrencia: l.recurrencia,
    habilitada: l.habilitada, patron: l.patron, horaInicio: l.horaInicio, horaFin: l.horaFin,
    diasCobertura: l.diasCobertura, diasSemana: l.diasSemana, itemCodigo: l.itemCodigo,
    cantidadEscalada: l.cantidadEscalada, cargoId: l.cargoId, sueldoOrigen: l.sueldoOrigen,
    sueldoModo: l.sueldoModo, afp: l.afp, saludTipo: l.saludTipo, saludPlanUf: l.saludPlanUf,
    tipoContrato: l.tipoContrato, personasPorPosicionEscaladas: l.personasPorPosicionEscaladas,
    personasMotivo: l.personasMotivo,
    sueldoBaseClp: verCostos ? l.sueldoBaseClp : undefined,
    liquidoObjetivoClp: verCostos ? l.liquidoObjetivoClp : undefined,
    colacionClp: verCostos ? l.colacionClp : undefined,
    movilizacionClp: verCostos ? l.movilizacionClp : undefined,
    precioUnitarioClp: verCostos ? l.precioUnitarioClp : undefined,
    huellaJuegoValores: verCostos ? l.huellaJuegoValores : undefined,
    costo: verCostos ? costo : undefined,
  };
}
