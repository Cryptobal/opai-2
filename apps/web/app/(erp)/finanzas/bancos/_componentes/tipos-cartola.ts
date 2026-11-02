export type VistaCartolaPreview = {
  aplicados: number;
  duplicados: number;
  rechazados: number;
  saldoFinal: number | null;
  filas: {
    indice: number;
    estado: string;
    motivo: string | null;
    monto: number | null;
    glosa: string | null;
  }[];
};
