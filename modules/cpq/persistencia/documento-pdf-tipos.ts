/** Entrada del PDF de cotización (separada de `documento-pdf.ts` por el tope de 150 líneas). */

export type LineaPdfCotizacion = {
  nombre: string;
  tipo: string;
  posiciones?: number;
  ventaMensualClp?: number | null;
};

export type EntradaPdfCotizacion = {
  codigo: string;
  titulo: string;
  negocio: string;
  versionNumero?: number;
  secciones: readonly {
    nombre: string;
    lineas: readonly LineaPdfCotizacion[];
  }[];
  calculo: {
    ventaMensual: number | null;
    fecha: string;
    pagosUnicos?: number;
    borradorSinPrecio?: boolean;
    uf?: { valorClpEscalado: number; fecha: string } | null;
    /** Tasa de IVA de venta del tenant (`PCT_ESCALA`); por defecto 19 %. */
    tasaIvaPct?: number;
  };
  condiciones?: string | null;
  validaHasta?: string | null;
  cliente?: {
    nombre: string;
    razonSocial: string | null;
    rut: string | null;
    giro: string | null;
    direccion: string | null;
  } | null;
  ejecutivo?: string | null;
  enviada?: boolean;
};
