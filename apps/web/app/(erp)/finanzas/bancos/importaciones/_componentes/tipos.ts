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

/** Un «Borrar por fechas» que se puede restaurar (CAR-412). */
export type DescarteMovimientos = {
  id: string;
  desde: string;
  hasta: string;
  origen: string;
  motivo: string;
  movimientos: number;
  descartadoEn: string;
  restauradoEn: string | null;
};

/** Vista previa de «Restaurar». */
export type VistaRestaurar = { descarteId: string; restaurados: number; yaPresentes: number; restaurado: boolean };
