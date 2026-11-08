// Formulario de programación recurrente (BRIEF-26 · CAR-159): estado y conversión al input de la capacidad.

export type LineaForm = {
  glosa: string;
  cantidad: string;
  precio: string;
  descuento: string;
  exento: boolean;
};

export type FormProgramacion = {
  nombre: string;
  cuentaId: string | null;
  tipoDte: "33" | "34";
  frecuencia: "mensual" | "quincenal" | "semanal" | "anual";
  diaGeneracion: string;
  diaSemana: string;
  mesDelAnio: string;
  moneda: "CLP" | "UF";
  politicaUf: string;
  diaUf: string;
  plazoPagoDias: string;
  fechaInicio: string;
  fechaFin: string;
  notas: string;
  autoEnvioProforma: boolean;
  autoEnvioEstadoPago: boolean;
  lineas: LineaForm[];
  destinatarioIds: string[];
};

export type DetalleProgramacion = {
  id: string;
  nombre: string;
  activa: boolean;
  cuentaId: string | null;
  cuentaNombre: string;
  instalacionNombre: string | null;
  tipoDte: number;
  frecuencia: string;
  diaGeneracion: number;
  diaSemana: number | null;
  mesDelAnio: number | null;
  moneda: string;
  politicaUf: string | null;
  diaUf: number | null;
  plazoPagoDias: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  notas: string | null;
  autoEnvioProforma: boolean;
  autoEnvioEstadoPago: boolean;
  montoTotal: number;
  proximaEjecucionEn: string | null;
  ultimoPeriodo10: string | null;
  lineas: { glosa: string; monto: number }[];
  lineasEditables: {
    glosa: string;
    cantidad: string;
    precioUnitario: number;
    descuentoPct: number;
    exento: boolean;
  }[];
  destinatarios: { contactoId: string; nombres: string; apellidos: string; email: string | null }[];
  corridas: {
    periodo: string;
    fechaGeneracion: string | null;
    documentoId: string | null;
    montoTotal: number | null;
  }[];
};

export const LINEA_VACIA: LineaForm = {
  glosa: "",
  cantidad: "1",
  precio: "",
  descuento: "0",
  exento: false,
};

export const FORM_VACIO: FormProgramacion = {
  nombre: "",
  cuentaId: null,
  tipoDte: "33",
  frecuencia: "mensual",
  diaGeneracion: "1",
  diaSemana: "1",
  mesDelAnio: "1",
  moneda: "CLP",
  politicaUf: "RUN_DAY",
  diaUf: "1",
  plazoPagoDias: "30",
  fechaInicio: "",
  fechaFin: "",
  notas: "",
  autoEnvioProforma: false,
  autoEnvioEstadoPago: false,
  lineas: [LINEA_VACIA],
  destinatarioIds: [],
};

/** "1.234.567" → 1234567 (pesos enteros). */
export function parseClp(t: string): number | null {
  const s = t.trim().replace(/\$/g, "").replace(/\s/g, "").replace(/\./g, "");
  return /^\d+$/.test(s) ? Number(s) : null;
}

/** "12,5" UF → 125000 (UF × 10.000), sin float. */
export function parseUf(t: string): number | null {
  const m = /^(\d{1,7})(?:[.,](\d{1,4}))?$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 10_000 + Number((m[2] ?? "").padEnd(4, "0"));
}

/** "15,5" % → 1550 centésimas. */
export function parseDescuento(t: string): number | null {
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(t.trim() || "0");
  if (!m) return null;
  const v = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return v <= 10_000 ? v : null;
}

export const ufTexto = (escalada: number) => {
  const entero = Math.trunc(escalada / 10_000);
  const dec = String(escalada % 10_000)
    .padStart(4, "0")
    .replace(/0+$/, "");
  return dec ? `${entero},${dec}` : String(entero);
};

export const descuentoTexto = (c: number) =>
  c % 100 === 0 ? String(c / 100) : `${Math.trunc(c / 100)},${String(c % 100).padStart(2, "0")}`;
