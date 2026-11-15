const TEXTOS: Record<string, string> = {
  sin_negocio: "la cotización no tiene negocio en OPAI 1",
  negocio_no_importado: "su negocio todavía no está en OPAI 2",
  codigo_ya_existe: "ya existe una cotización con ese código",
  sin_responsable: "falta el usuario responsable",
  cotizacion_sin_venta_mensual: "no trae venta mensual",
  cotizacion_con_costos_sin_modelo: "trae costos que OPAI 2 no modela (se cuentan, no se importan)",
};

/** Motivo de la importación de cotizaciones en lenguaje de negocio. */
export const textoMotivo = (codigo: string) => TEXTOS[codigo] ?? codigo;
