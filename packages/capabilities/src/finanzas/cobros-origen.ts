/**
 * Filas de lote que crearon un documento histórico, cuyo cobrado en el origen queda en `previos.cobradoApertura`:
 * la apertura de 1.0 (CAR-168) y el importador de documentos de venta (CAR-283).
 */
export const ORIGEN_HISTORICO = [
  { entidad: "documento_cobrar", importacion: { versionContrato: "finanzas-apertura@1", estado: "completada" } },
  { entidad: "documento_venta", importacion: { versionContrato: "motor-archivo/v1", estado: "completada" } },
];
