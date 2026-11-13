export type VistaCartolaPreview = {
  aplicados: number;
  duplicados: number;
  rechazados: number;
  saldoFinal: number | null;
  /** Saldo inicial + detalle = saldo final (CAR-341); null si la cartola no trae saldos. */
  cuadratura: {
    saldoInicial: number;
    saldoFinal: number;
    sumaDetalle: number;
    diferencia: number;
    cuadra: boolean;
  } | null;
  filas: {
    indice: number;
    estado: string;
    motivo: string | null;
    monto: number | null;
    glosa: string | null;
  }[];
};
