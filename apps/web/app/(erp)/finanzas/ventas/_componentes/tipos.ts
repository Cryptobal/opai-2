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
};

export type LibroVentas = {
  items: Venta[];
  siguiente: string | null;
  resumen: { documentos: number; neto: number; iva: number; total: number };
};
