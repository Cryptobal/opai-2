export type Venta = {
  id: string;
  cuentaId: string;
  cuentaNombre: string;
  cuentaRut: string | null;
  tipoDte: number;
  tipoDteNombre: string;
  folio: number | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  montoTotal: number;
  estadoDte: "borrador" | "enviado" | "aceptado" | "rechazado" | "anulado_nc";
  estadoCobro: "pendiente" | "pagada_parcial" | "pagada" | "cedida";
  cesionEstado: "emitido" | "cedido" | "no_cedido" | null;
  /** Solo en la vista previa de emitir: con qué proveedor y en qué ambiente se firmaría (CAR-242). */
  emisionPrevista?: { proveedor: "simulado" | "simpleapi"; ambiente: "certificacion" | "produccion" };
};

/** Línea de un borrador tal como la entrega `finanzas.ventas.obtener` (CAR-248: para poder editarla). */
export type LineaBorrador = {
  glosa: string;
  monto: number;
  cantidad?: string | null;
  precioUnitario?: number | null;
  descuentoPct?: number | null;
};

/** Lo que la ficha sabe de un borrador y la hoja de edición necesita. */
export type DatosBorrador = {
  montoIva?: number;
  glosa?: string | null;
  lineas?: LineaBorrador[];
};

export type LibroVentas = {
  items: Venta[];
  siguiente: string | null;
  resumen: { documentos: number; neto: number; iva: number; total: number };
};
