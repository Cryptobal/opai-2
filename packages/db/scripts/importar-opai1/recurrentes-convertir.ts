// Conversión pura de una plantilla recurrente de 1.0 a la programación de 2.0 (CAR-25).
// Lo no soportado devuelve un motivo nombrado (sin valores ni datos personales).
import { UF_ESCALA } from "@opai/domain";

import { correo, rut, textoLimpio } from "./normalizar";
import type { ProgramacionRecurrenteOpai1 } from "./origen";
import type { DatosProgramacion, DestinatarioCorreo, LineaProgramacion } from "./recurrentes-tipos";

export const TIPOS_DTE = [33, 34, 56, 61] as const;
const FRECUENCIAS: Record<string, string> = {
  monthly: "mensual",
  biweekly: "quincenal",
  weekly: "semanal",
  yearly: "anual",
};
const POLITICAS_UF = ["RUN_DAY", "LAST_DAY_PREV_MONTH", "FIRST_DAY_MONTH", "LAST_DAY_MONTH", "CUSTOM_DAY"];
const RE_PERIODO = /^\d{4}-\d{2}(-\d{2})?$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}/;

export type Resultado<T> = { ok: true; valor: T } | { ok: false; motivo: string };
const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
const no = (motivo: string): Resultado<never> => ({ ok: false, motivo });
const enRango = (n: number | null | undefined, min: number, max: number) =>
  n == null || (n >= min && n <= max);

function fechaDia(v: string | null | undefined): Resultado<string | null> {
  const t = textoLimpio(v);
  if (!t) return ok(null);
  return RE_FECHA.test(t) ? ok(t.slice(0, 10)) : no("fecha_invalida");
}

function convertirLinea(l: ProgramacionRecurrenteOpai1["lines"][number], moneda: string): Resultado<LineaProgramacion> {
  const glosa = textoLimpio(l.itemName) ?? textoLimpio(l.description);
  if (!glosa) return no("linea_sin_glosa");
  const uf = moneda === "UF";
  const precio = uf ? l.unitPriceUf : l.unitPrice;
  if (precio == null) return no("linea_sin_precio_de_la_moneda");
  return ok({
    glosa: glosa.slice(0, 500),
    cantidad: l.quantity.toFixed(4),
    unidad: textoLimpio(l.unit),
    precioUnitarioClp: uf ? null : Math.round(precio),
    precioUnitarioUf: uf ? Math.round(precio * UF_ESCALA) : null,
    descuentoPct: Math.round(l.discountPct * 100),
    exento: l.isExempt,
    tieneCuentaContable1_0: textoLimpio(l.accountId) !== null,
  });
}

/** Mes de la última corrida exitosa de 1.0 (zona de Chile): la 1.ª generación de 2.0 es la siguiente. */
export function ultimoPeriodo(f: ProgramacionRecurrenteOpai1): string | null {
  const exacto = textoLimpio(f.lastSuccessfulRun?.period);
  if (exacto && RE_PERIODO.test(exacto)) return exacto;
  const fuente = f.lastSuccessfulRun?.runAt ?? f.lastRunAt;
  if (!fuente) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" })
    .format(new Date(fuente))
    .slice(0, 7);
}

export function correosDestinatarios(f: ProgramacionRecurrenteOpai1): DestinatarioCorreo[] {
  const salida: DestinatarioCorreo[] = [];
  const visto = new Set<string>();
  const agregar = (valor: string | null | undefined, tipo: "para" | "cc") => {
    const c = correo(valor);
    if (c && !visto.has(c)) {
      visto.add(c);
      salida.push({ correo: c, tipo });
    }
  };
  agregar(f.receiverEmail, "para");
  for (const c of f.receiverEmailCc) agregar(c, "cc");
  return salida;
}

type Base = Omit<DatosProgramacion, "cuentaId" | "instalacionId" | "destinatariosContactoOpai1Ids">;

/** Valida y convierte los campos propios de la plantilla. No resuelve cuenta, instalación ni contactos. */
export function convertirProgramacion(f: ProgramacionRecurrenteOpai1): Resultado<Base> {
  if (!(TIPOS_DTE as readonly number[]).includes(f.dteType)) return no("tipo_dte_no_soportado");
  if (f.currency !== "CLP" && f.currency !== "UF") return no("moneda_no_soportada");
  const frecuencia = FRECUENCIAS[f.frequency];
  if (!frecuencia) return no("frecuencia_no_soportada");
  if (f.dayOfMonth !== -1 && !enRango(f.dayOfMonth, 1, 31)) return no("dia_del_mes_fuera_de_rango");
  if (!enRango(f.dayOfWeek, 0, 6)) return no("dia_de_semana_fuera_de_rango");
  if (!enRango(f.monthOfYear, 1, 12)) return no("mes_del_anio_fuera_de_rango");
  if (f.ufFixingPolicy && !POLITICAS_UF.includes(f.ufFixingPolicy)) return no("politica_uf_no_soportada");
  if (!enRango(f.ufFixingDay, 1, 31)) return no("dia_uf_fuera_de_rango");
  if (!enRango(f.ipcAdjustmentMonths, 1, 60)) return no("ajuste_ipc_fuera_de_rango");
  const inicio = fechaDia(f.startDate);
  const fin = fechaDia(f.endDate);
  const ipcDesde = fechaDia(f.ipcStartDate);
  for (const x of [inicio, fin, ipcDesde]) if (!x.ok) return x;
  if (f.lines.length === 0) return no("sin_lineas");
  const lineas: LineaProgramacion[] = [];
  for (const l of f.lines) {
    const c = convertirLinea(l, f.currency);
    if (!c.ok) return c;
    lineas.push(c.valor);
  }
  const ipc = f.hasIpcAdjustment && f.ipcAdjustmentMonths != null;
  return ok({
    nombre: textoLimpio(f.name) ?? `Programación ${f.id.slice(0, 8)}`,
    // Pausada y sin próxima ejecución: la activa Carlos al cortar (D4); no se copia `nextRunAt`.
    activa: false,
    tipoDte: f.dteType,
    frecuencia,
    diaGeneracion: f.dayOfMonth,
    diaSemana: f.dayOfWeek ?? null,
    mesDelAnio: f.monthOfYear ?? null,
    moneda: f.currency,
    plazoPagoDias: f.diasCobroDesdeFactura,
    facturaTiming: f.facturaTiming,
    facturaDia: f.facturaDay ?? null,
    facturaMesRelativo: f.facturaMesRelativo,
    modoPeriodoFacturado: f.billingPeriodMode,
    politicaTextoPeriodo: f.periodPolicy,
    montoVariable: f.variableAmount,
    autoEnvioProforma: f.autoSendProforma,
    autoEnvioEstadoPago: f.autoSendPaymentStatement,
    envioAutomatico: f.autoSendEmail,
    notas: textoLimpio(f.notes),
    referenciasAdicionales: f.additionalReferences,
    fechaInicio: inicio.ok ? inicio.valor : null,
    fechaFin: fin.ok ? fin.valor : null,
    politicaUf: f.ufFixingPolicy ?? null,
    diaUf: f.ufFixingDay ?? null,
    ajusteIpcMeses: ipc ? (f.ipcAdjustmentMonths ?? null) : null,
    ajusteIpcDesde: ipc && ipcDesde.ok ? ipcDesde.valor : null,
    receptor: {
      rut: rut(f.receiverRut),
      razonSocial: textoLimpio(f.receiverName),
      giro: textoLimpio(f.receiverGiro),
      direccion: textoLimpio(f.receiverDireccion),
      comuna: textoLimpio(f.receiverComuna),
      ciudad: textoLimpio(f.receiverCiudad),
    },
    ultimoPeriodo10: ultimoPeriodo(f),
    ultimaEjecucionEn: f.lastRunAt ?? null,
    lineas,
    destinatariosCorreo: correosDestinatarios(f),
  });
}
