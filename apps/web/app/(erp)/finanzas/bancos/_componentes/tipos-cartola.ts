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
  /** La cuenta ya tiene una cartola con este período (CAR-341). */
  yaImportada?: { nombreArchivo: string | null; creadaEn: string } | null;
  /** Del banco en línea, en el período de una cartola que cuadra, sin par en ella (CAR-450). */
  sobrantesEnLinea: { id: string; fecha: string; monto: number; glosa: string }[];
  sobrantesTotal: number;
  filas: {
    indice: number;
    estado: string;
    motivo: string | null;
    monto: number | null;
    glosa: string | null;
  }[];
};
