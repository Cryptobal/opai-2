import type { z } from "zod";

import { reglaDeNegocio } from "@opai/capabilities";

import { esFechaIso, lunesDe } from "../domain";
import { MONTO_FLUJO_MAX } from "./esquemas";
import { MENSAJE_SIN_INGRESOS } from "./solo-egresos";

import type { filaImportSchema } from "./importar-esquema";

export { filaImportSchema, MAX_FILAS_IMPORT } from "./importar-esquema";

type FilaImport = z.infer<typeof filaImportSchema>;

/** Monto entero CLP: opcional punto de miles; sin decimales. */
export function parsearMontoClp(
  texto: string,
): { ok: true; monto: number } | { ok: false; motivo: string } {
  const t = texto.trim();
  if (!t) return { ok: true, monto: 0 };
  if (/^\d+\.\d+$/.test(t) && !/^\d+(\.\d{3})+$/.test(t))
    return {
      ok: false,
      motivo:
        "Use montos enteros en CLP, sin decimales (ej. «1234.56» no es válido: indique 123456).",
    };
  if (t.includes(","))
    return {
      ok: false,
      motivo: "Use montos enteros en CLP, sin decimales (ej. «1234.56» no es válido: use 123456).",
    };
  if (!/^\d+(\.\d{3})*$/.test(t))
    return {
      ok: false,
      motivo: "Monto inválido: use enteros con punto de miles opcional (ej. 1.234.567).",
    };
  const monto = Number(t.replace(/\./g, ""));
  if (!Number.isSafeInteger(monto) || monto < 0 || monto > MONTO_FLUJO_MAX)
    return { ok: false, motivo: "Monto fuera de rango permitido." };
  return { ok: true, monto };
}

/** Divide una línea CSV (RFC 4180): campos entre comillas con separador, comillas dobles escapadas. */
export function dividirLineaCsv(linea: string, sep: string): string[] {
  const out: string[] = [];
  let actual = "";
  let entre = false;
  for (let i = 0; i < linea.length; i += 1) {
    const ch = linea[i] as string;
    if (entre) {
      if (ch === '"' && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else if (ch === '"') entre = false;
      else actual += ch;
    } else if (ch === '"') entre = true;
    else if (ch === sep) {
      out.push(actual.trim());
      actual = "";
    } else actual += ch;
  }
  out.push(actual.trim());
  return out;
}

export function parsearCsv(texto: string): Record<string, string>[] {
  const lineas = texto
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lineas.length < 2) throw reglaDeNegocio("La planilla CSV debe tener encabezado y al menos una fila.");
  const sep = lineas[0]?.includes(";") && !lineas[0]?.includes(",") ? ";" : ",";
  const cols = dividirLineaCsv(lineas[0] ?? "", sep).map((c) => c.toLowerCase());
  return lineas.slice(1).map((linea) => {
    const vals = dividirLineaCsv(linea, sep);
    const row: Record<string, string> = {};
    cols.forEach((c, i) => {
      row[c] = vals[i] ?? "";
    });
    return row;
  });
}

export function filasDesdeCsv(texto: string) {
  return parsearCsv(texto).map((r, indice) => {
    const parsed = filaDesdeRegistroCsv(r, indice);
    if (!parsed.ok) throw reglaDeNegocio(parsed.motivo);
    return parsed.fila;
  });
}

export function filaDesdeRegistroCsv(
  r: Record<string, string>,
  indice: number,
):
  | { ok: true; fila: FilaImport }
  | { ok: false; motivo: string } {
  const filaNum = indice + 2;
  const semanaRaw = r.semana ?? r.lunes ?? "";
  if (!semanaRaw) return { ok: false, motivo: `Fila ${filaNum}: falta la semana.` };
  if (!esFechaIso(semanaRaw)) return { ok: false, motivo: `Fila ${filaNum}: semana inválida.` };
  const semana = lunesDe(semanaRaw);
  const seccion = (r.seccion ?? "").toLowerCase();
  if (seccion !== "ingreso" && seccion !== "egreso")
    return { ok: false, motivo: `Fila ${filaNum}: sección inválida (use ingreso o egreso).` };
  if (seccion === "ingreso") return { ok: false, motivo: `Fila ${filaNum}: ${MENSAJE_SIN_INGRESOS}` };
  // Un monto vacío no pisa el valor existente con 0: es un error de la fila.
  if (!(r.monto ?? "").trim()) return { ok: false, motivo: `Fila ${filaNum}: falta el monto.` };
  const montoParse = parsearMontoClp(r.monto ?? "");
  if (!montoParse.ok) return { ok: false, motivo: `Fila ${filaNum}: ${montoParse.motivo}` };
  const etiqueta = r.etiqueta ?? r.fila ?? "";
  if (etiqueta.trim().length < 2)
    return { ok: false, motivo: `Fila ${filaNum}: falta la etiqueta de la fila.` };
  return {
    ok: true,
    fila: {
      seccion: seccion as "ingreso" | "egreso",
      etiqueta,
      semana,
      monto: montoParse.monto,
      ...(r.nota ? { nota: r.nota } : {}),
      ...(r.vinculo ? { vinculo: r.vinculo } : {}),
    },
  };
}
