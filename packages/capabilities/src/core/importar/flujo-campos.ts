// Campos de los importadores del flujo de caja (CAR-349, bloque 3): filas (categorías) y gastos recurrentes.
// Los sinónimos aceptan los nombres de OPAI 1 (secciones, frecuencias, modos de monto y políticas de UF).
import type { DefinicionImportador, ValorImportado } from "@opai/domain/importacion";

import { CAMPO_ID_EXTERNO } from "./comun";

export const DEF_FLUJO_FILAS: DefinicionImportador = {
  id: "flujo_filas",
  etiqueta: "Filas del flujo de caja",
  descripcion:
    "Categorías de egreso de la planilla del flujo (arriendo, remuneraciones, retiro de cada socio…). Se reconocen por su nombre. Los ingresos no se importan: salen de lo facturado y cobrado.",
  campos: [
    CAMPO_ID_EXTERNO,
    { clave: "etiqueta", etiqueta: "Nombre de la fila", tipo: "texto", requerido: true, sinonimos: ["name", "nombre", "fila", "categoria", "categoría"], ejemplo: "Arriendo oficina", largoMaximo: 120 },
    { clave: "seccion", etiqueta: "Sección", tipo: "opcion", sinonimos: ["section"], ejemplo: "egreso",
      ayuda: "Las secciones de egreso de OPAI 1 (remuneraciones, impuestos, GAV, otros, financiamiento) entran como egreso.",
      opciones: { egreso: ["egresos", "gasto", "gastos", "remuneraciones", "impuestos", "gav", "otros", "financiamiento"], ingreso: ["ingresos", "income"] } },
    { clave: "orden", etiqueta: "Orden", tipo: "entero", sinonimos: ["order", "position", "sortOrder"], ejemplo: "10" },
  ],
};

export const DEF_FLUJO_RECURRENTES: DefinicionImportador = {
  id: "flujo_recurrentes",
  etiqueta: "Gastos recurrentes del flujo de caja",
  descripcion:
    "Gastos fijos que se proyectan solos (arriendo, honorarios, retiro de socios). Cada uno va a una fila de egresos que ya existe; se reconocen por fila y concepto.",
  campos: [
    CAMPO_ID_EXTERNO,
    { clave: "fila", etiqueta: "Fila del flujo", tipo: "texto", requerido: true, sinonimos: ["row", "rowName", "categoria", "categoría"], ejemplo: "Arriendo oficina", largoMaximo: 120 },
    { clave: "concepto", etiqueta: "Concepto", tipo: "texto", requerido: true, sinonimos: ["nombre", "descripcion", "descripción", "name"], ejemplo: "Arriendo Las Condes", largoMaximo: 120 },
    { clave: "unidad", etiqueta: "Unidad del monto", tipo: "opcion", sinonimos: ["currency", "amountMode", "moneda"], ejemplo: "uf",
      opciones: { clp: ["pesos", "fixed"], uf: [], pct_ventas: ["pct_sales", "% ventas", "porcentaje", "pct"] } },
    // Texto: se interpreta recién al conocer la unidad («80.000» son ochenta mil pesos, «12,5» son doce UF y media).
    { clave: "monto", etiqueta: "Monto", tipo: "texto", requerido: true, sinonimos: ["amount", "amountUf", "pctSales", "valor"], ejemplo: "12,5", largoMaximo: 40,
      ayuda: "En pesos (80.000), en UF con hasta 4 decimales (12,5) o en porcentaje de ventas (5 = 5 %), según la unidad." },
    { clave: "frecuencia", etiqueta: "Frecuencia", tipo: "opcion", requerido: true, sinonimos: ["frequency"], ejemplo: "mensual",
      opciones: { semanal: ["weekly"], quincenal: ["biweekly", "fortnightly"], mensual: ["monthly"] } },
    { clave: "dia_del_mes", etiqueta: "Día del mes", tipo: "entero", sinonimos: ["dayOfMonth", "dia"], ejemplo: "5", ayuda: "Solo mensual: 1 a 31, o -1 para el último día." },
    { clave: "inicio", etiqueta: "Desde", tipo: "fecha", requerido: true, sinonimos: ["startDate", "fecha inicio"], ejemplo: "01-01-2026" },
    { clave: "fin", etiqueta: "Hasta", tipo: "fecha", sinonimos: ["endDate", "fecha fin"], ejemplo: "" },
    { clave: "repeticiones", etiqueta: "Cantidad de cuotas", tipo: "entero", sinonimos: ["endAfterOccurrences", "cuotas"], ejemplo: "" },
    { clave: "politica_uf", etiqueta: "Día de la UF", tipo: "opcion", sinonimos: ["ufPolicy"], ejemplo: "dia_cuota",
      opciones: { dia_cuota: ["run_day", "dia de la cuota"], fin_de_mes: ["last_day_month"], fin_mes_anterior: ["last_day_prev_month"], inicio_de_mes: ["first_day_month"], dia_fijo: ["custom_day"] } },
    { clave: "uf_dia_fijo", etiqueta: "Día fijo de la UF", tipo: "entero", sinonimos: ["ufCustomDay"], ejemplo: "" },
    { clave: "nota", etiqueta: "Nota", tipo: "texto", sinonimos: ["note", "memo", "detalle"], ejemplo: "", largoMaximo: 500 },
  ],
};

/** Tope del monto guardado (el mismo de `montoSchema` del flujo): sobre él, la lectura del flujo fallaría. */
const MONTO_MAX = 999_999_999_999;

/** Número de una celda chilena: en pesos el punto separa miles; en UF o % el punto es decimal salvo que haya coma. */
function numeroDe(unidad: string, texto: string): number | null {
  let t = texto.replace(/[$%\s]/g, "").replace(/UF/gi, "");
  if (unidad === "clp" || t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** Escala entera del monto según la unidad (igual que `flujo_recurrentes.monto`): CLP, UF × 10.000, % × 10.000. */
export function montoEscalado(unidad: string, v: ValorImportado | undefined): number | null {
  const valor = typeof v === "number" ? v : typeof v === "string" ? numeroDe(unidad, v) : null;
  if (valor == null || !Number.isFinite(valor) || valor <= 0) return null;
  const n = Math.round(unidad === "clp" ? valor : valor * 10_000);
  return Number.isSafeInteger(n) && n > 0 && n <= MONTO_MAX ? n : null;
}

export type ReglaImportada = {
  unidad: string; monto: number; frecuencia: string; diaDelMes: number | null; inicio: string; fin: string | null;
  repeticiones: number | null; politicaUf: string; ufDiaFijo: number | null;
};

/** Lo que la tabla rechazaría (CHECK) o que no tiene sentido, explicado para la vista previa. */
export function problemaRegla(r: ReglaImportada): string | null {
  if (r.unidad === "pct_ventas" && r.monto > 1_000_000) return "El porcentaje de ventas no puede superar el 100 %.";
  if (r.frecuencia !== "mensual" && r.diaDelMes != null) return "El día del mes solo aplica a la frecuencia mensual.";
  if (r.diaDelMes != null && r.diaDelMes !== -1 && (r.diaDelMes < 1 || r.diaDelMes > 31)) return "Día del mes de 1 a 31, o −1 para el último día.";
  if (r.fin && r.fin < r.inicio) return "La fecha de término es anterior a la de inicio.";
  if (r.repeticiones != null && (r.repeticiones < 1 || r.repeticiones > 600)) return "La cantidad de cuotas va de 1 a 600.";
  if (r.unidad !== "uf" && r.politicaUf !== "dia_cuota") return "El día de la UF solo aplica a montos en UF.";
  if ((r.politicaUf === "dia_fijo") !== (r.ufDiaFijo != null)) return "Con «día fijo» indica el día de la UF (y solo con esa política).";
  if (r.ufDiaFijo != null && (r.ufDiaFijo < 1 || r.ufDiaFijo > 31)) return "El día fijo de la UF va de 1 a 31.";
  return null;
}
