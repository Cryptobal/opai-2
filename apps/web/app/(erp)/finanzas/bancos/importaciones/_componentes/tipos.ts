/** Una cartola importada en el historial de la cuenta (CAR-341). */
export type ImportacionCartola = {
  id: string;
  nombreArchivo: string | null;
  formato: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  movimientos: number;
  conciliados: number;
  saldoInicial: number | null;
  saldoFinal: number | null;
  creadaPor: string | null;
  viaAgente: boolean;
  creadaEn: string;
};

/** Vista previa de «Deshacer importación»: qué se borraría. */
export type VistaDeshacer = {
  cartolaId: string;
  nombreArchivo: string | null;
  movimientos: number;
  conciliados: number;
  deshecha: boolean;
};
