/** Forma de las lecturas `cpq.portal_cotizaciones.*` (solo lo que el portal muestra; sin costos ni márgenes). */
export type ItemCotizacion = {
  cotizacionId: string;
  codigo: string;
  titulo: string;
  versionNumero: number;
  enviadaEn: string | null;
  validaHasta: string | null;
  netoMensualClp: number | null;
  ivaClp: number | null;
  totalMensualClp: number | null;
  tienePropuesta: boolean;
};

export type DetalleCotizacion = ItemCotizacion & {
  secciones: {
    nombre: string;
    puestos: {
      nombre: string;
      posiciones: number;
      patron: string | null;
      horaInicio: string | null;
      horaFin: string | null;
      diasCobertura: number | null;
    }[];
  }[];
  documentos: { tipo: "cotizacion" | "propuesta"; nombre: string }[];
};
