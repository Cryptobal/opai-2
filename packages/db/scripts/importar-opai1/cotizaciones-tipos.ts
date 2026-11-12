// Tipos del plan de cotizaciones de 1.0 (CAR-326).
export type DatosLineaCotizacion = {
  nombre: string;
  grupo: string | null;
  posiciones: number;
  orden: number;
  horaInicio: string | null;
  horaFin: string | null;
  /** 1 = lunes … 7 = domingo. */
  diasSemana: number[];
  sueldoBaseClp: number | null;
  afp: string | null;
  saludTipo: "fonasa" | "isapre" | null;
};

export type DatosCotizacion = {
  codigo: string;
  negocioIdOpai1: string;
  titulo: string;
  estado: "borrador" | "enviada" | "aceptada" | "rechazada";
  moneda: "CLP" | "UF";
  /** AAAA-MM-DD. */
  validaHasta: string | null;
  enviadaEn: string | null;
  ventaMensualClp: number | null;
  margenModo: "margen_sobre_venta" | "markup" | "margen_sobre_mano_de_obra";
  meses: number | null;
  instalacionIdOpai1: string | null;
  creadaEn: string;
  vigente: boolean;
  lineas: DatosLineaCotizacion[];
};
