import type {
  EstadoObligacion,
  EstadoPeriodo,
  TipoNovedad,
  TipoObligacion,
} from "@opai/domain";

type Tono = "neutro" | "success" | "warning" | "danger" | "info" | "accent";

export const ESTADO_PERIODO: Record<EstadoPeriodo, { etiqueta: string; tono: Tono }> = {
  abierto: { etiqueta: "Abierto", tono: "info" },
  en_revision: { etiqueta: "En revisión", tono: "warning" },
  cerrado: { etiqueta: "Cerrado", tono: "neutro" },
  pagado: { etiqueta: "Pagado", tono: "success" },
};

export const TIPO_NOVEDAD: Record<TipoNovedad, string> = {
  licencia: "Licencia",
  ausencia: "Ausencia",
  horas_extra: "Horas extra",
  anticipo: "Anticipo",
  prestamo: "Cuota de préstamo",
  descuento: "Descuento",
};

export const UNIDAD: Record<TipoNovedad, "días" | "horas" | "$"> = {
  licencia: "días",
  ausencia: "días",
  horas_extra: "horas",
  anticipo: "$",
  prestamo: "$",
  descuento: "$",
};

export const ESTADO_OBLIGACION: Record<EstadoObligacion, { etiqueta: string; tono: Tono }> = {
  por_generar: { etiqueta: "Por generar", tono: "neutro" },
  generado: { etiqueta: "Generado", tono: "info" },
  con_errores: { etiqueta: "Con errores", tono: "danger" },
  cargado: { etiqueta: "Cargado", tono: "success" },
  pagado: { etiqueta: "Pagado", tono: "success" },
};

export const ETIQUETA_OBLIGACION: Record<TipoObligacion, string> = {
  lre: "Libro de Remuneraciones Electrónico (LRE)",
  previred: "Previred",
  f29_retencion: "Retención de impuesto único (F29)",
  dj_sueldos: "Declaración Jurada de sueldos",
  certificado_sueldos: "Certificado de sueldos",
};

export const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MES_LARGO = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** $ 1.234.567 */
export const pesos = (n: number) => `$ ${n.toLocaleString("es-CL")}`;
