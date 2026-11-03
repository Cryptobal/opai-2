/** Margen mínimo Gard (10 % sobre venta), mismo tope que el motor en recalcular. */
export const MARGEN_MINIMO_PCT = 100_000;

export type ItemBandejaCpq = {
  id: string;
  tipo: "margen" | "envio_propuesta";
  estado: string;
  resumen: string;
  cotizacionId: string;
  codigo: string;
  titulo: string;
  cuentaNombre: string;
  ventaMensualClp: number | null;
  margenEfectivoPct: number | null;
  margenMinimoPct: number;
  solicitanteId: string;
  solicitanteNombre: string;
  comentario: string | null;
  creadaEn: string;
  resueltaEn: string | null;
  motivo: string | null;
  enlaceCotizacion: string;
  enlaceBandeja: string;
};
