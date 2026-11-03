/** Línea de puesto tal como la edita la hoja: sueldo y montos solo con `cpq:costos.ver` (R59). */
export type LineaEditable = {
  id: string;
  nombre: string;
  posiciones?: number | undefined;
  sueldoBaseClp?: number | undefined;
  cargoId?: string | null | undefined;
  patron?: string | null | undefined;
  horaInicio?: string | null | undefined;
  horaFin?: string | null | undefined;
  diasSemana?: number[] | undefined;
  sueldoModo?: string | undefined;
  liquidoObjetivoClp?: number | null | undefined;
  colacionClp?: number | null | undefined;
  movilizacionClp?: number | null | undefined;
  afp?: string | null | undefined;
  saludTipo?: string | null | undefined;
  saludPlanUf?: number | null | undefined;
  tipoContrato?: string | null | undefined;
};
