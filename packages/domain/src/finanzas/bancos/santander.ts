import ExcelJS from "exceljs";

import { claveDedupe } from "./dedupe";
import { fechaDesdeDdMmAaaa } from "./fechas";
import { esRemuneracion } from "./remuneracion";

export type FilaCartolaParseada = {
  indice: number;
  fecha: string;
  monto: number;
  glosa: string;
  referencia: string | null;
  sucursal: string | null;
  saldoDespues: number | null;
  claveDedupe: string;
  esRemuneracion: boolean;
};

export type ResultadoCartola = {
  fechaDesde: string | null;
  fechaHasta: string | null;
  saldoFinal: number | null;
  filas: FilaCartolaParseada[];
  rechazadas: { indice: number; motivo: string }[];
};

const MAX_BYTES = 5 * 1024 * 1024;

/** Parser cartola Santander XLSX (columnas MONTO, DESCRIPCIÓN, FECHA, N° DOC, SUCURSAL). */
export async function parsearCartolaSantander(contenido: Buffer): Promise<ResultadoCartola> {
  if (contenido.byteLength > MAX_BYTES) {
    throw new Error("La cartola supera el máximo de 5 MB.");
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(contenido as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  const hoja = workbook.worksheets[0];
  if (!hoja) return { fechaDesde: null, fechaHasta: null, saldoFinal: null, filas: [], rechazadas: [] };
  const rows: (string | number | null)[][] = [];
  hoja.eachRow((row) => {
    const vals = row.values as (string | number | null | undefined)[];
    rows.push(vals.slice(1).map((c) => (c === undefined ? null : c)));
  });
  return parsearFilasSantander(rows);
}

export function parsearFilasSantander(rows: (string | number | null)[][]): ResultadoCartola {
  let fechaDesde: string | null = null;
  let fechaHasta: string | null = null;
  let saldoFinal: number | null = null;
  let headerIdx = -1;
  const cols: Record<string, number> = {};
  const filas: FilaCartolaParseada[] = [];
  const rechazadas: { indice: number; motivo: string }[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const texto = row.map((c) => String(c ?? "")).join(" ");
    if (/fecha\s+desde/i.test(texto)) {
      fechaDesde = extraerFechaEnLinea(texto, "desde") ?? fechaDesde;
      fechaHasta = extraerFechaEnLinea(texto, "hasta") ?? fechaHasta;
    }
    if (/saldos\s+diarios/i.test(texto)) break;

    if (headerIdx < 0 && row.some((c) => /MONTO|DESCRIP/i.test(String(c ?? "")))) {
      headerIdx = i;
      row.forEach((c, j) => {
        const k = String(c ?? "").trim().toUpperCase();
        if (k.includes("MONTO")) cols.monto = j;
        if (k.includes("DESCRIP")) cols.glosa = j;
        if (k === "FECHA" || k.includes("FECHA")) cols.fecha = j;
        if (k.includes("DOC")) cols.ref = j;
        if (k.includes("SUCURSAL")) cols.suc = j;
        if (k.includes("SALDO")) cols.saldo = j;
      });
      continue;
    }
    if (headerIdx < 0 || i <= headerIdx) continue;
    if (row.every((c) => c == null || String(c).trim() === "")) continue;

    const parsed = filaDesdeRow(row, cols, i);
    if (!parsed.ok) {
      rechazadas.push({ indice: i, motivo: parsed.motivo });
      continue;
    }
    if (parsed.saldoFinal != null) saldoFinal = parsed.saldoFinal;
    if (parsed.fila) filas.push(parsed.fila);
  }

  return { fechaDesde, fechaHasta, saldoFinal, filas, rechazadas };
}

function filaDesdeRow(
  row: (string | number | null)[],
  cols: Record<string, number>,
  indice: number,
):
  | { ok: true; fila?: FilaCartolaParseada; saldoFinal?: number }
  | { ok: false; motivo: string } {
  const fechaRaw = row[cols.fecha ?? -1];
  const iso = fechaDesdeDdMmAaaa(String(fechaRaw ?? ""));
  if (!iso) return { ok: false, motivo: "Fecha inválida." };
  const monto = parseMonto(row[cols.monto ?? -1]);
  if (monto == null || monto === 0) return { ok: false, motivo: "Monto inválido." };
  const glosa = String(row[cols.glosa ?? -1] ?? "").trim();
  if (!glosa) return { ok: false, motivo: "Glosa vacía." };
  const referencia = cols.ref != null ? String(row[cols.ref] ?? "").trim() || null : null;
  const sucursal = cols.suc != null ? String(row[cols.suc] ?? "").trim() || null : null;
  const saldoCell = cols.saldo != null ? parseMonto(row[cols.saldo]) : null;
  const clave = claveDedupe({ fecha: iso, monto, glosa, referencia });
  const fila: FilaCartolaParseada = {
    indice,
    fecha: iso,
    monto,
    glosa,
    referencia,
    sucursal,
    saldoDespues: saldoCell,
    claveDedupe: clave,
    esRemuneracion: esRemuneracion(glosa),
  };
  if (saldoCell != null && row.length <= (cols.saldo ?? 0) + 1) {
    return { ok: true, saldoFinal: saldoCell, fila };
  }
  return { ok: true, fila };
}

function parseMonto(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  const t = String(v).replace(/\$/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function extraerFechaEnLinea(texto: string, clave: "desde" | "hasta"): string | null {
  const re = clave === "desde" ? /desde\s+(\d{1,2}\/\d{1,2}\/\d{4})/i : /hasta\s+(\d{1,2}\/\d{1,2}\/\d{4})/i;
  const m = texto.match(re);
  return m?.[1] ? fechaDesdeDdMmAaaa(m[1]) : null;
}
