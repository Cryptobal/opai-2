/** Vista de un rango CAF (`finanzas.folios.listar` / `cargar_caf`). */
export type FolioCaf = {
  id: string;
  tipoDte: number;
  folioDesde: number;
  folioHasta: number;
  folioActual: number;
  restantes: number;
  alertaFoliosBajos: boolean;
  alertaCafPorVencer: boolean;
  alerta: boolean;
  cafVenceEn: string | null;
  activo: boolean;
  /** Ambiente del CAF según su IDK (CAR-240); null si no se pudo determinar. */
  ambiente?: "certificacion" | "produccion" | null;
  /** Etiqueta del ambiente armada en el servidor (`etiquetaAmbienteCaf`). */
  ambienteCaf: { etiqueta: string; tono: "info" | "warning" | "neutro" };
  /** Presente tras vista previa o carga con el contrato endurecido (#217). */
  lectura?: string;
};

export type VistaPreviaCaf = FolioCaf;
