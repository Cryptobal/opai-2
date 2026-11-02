import type { z } from "zod";

import { reglaDeNegocio } from "@opai/capabilities";

import { lunesDe } from "../domain";

import type { filaImportSchema } from "./importar-esquema";

export { filaImportSchema, MAX_FILAS_IMPORT } from "./importar-esquema";

type FilaImport = z.infer<typeof filaImportSchema>;

/** Monto entero CLP: opcional punto de miles; sin decimales. */
export function parsearMontoClp(
  texto: string,
): { ok: true; monto: number } | { ok: false; motivo: string } {
  const t = texto.trim();
  if (!t) return { ok: true, monto: 0 };
  if (t.includes(","))
    return { ok: false, motivo: "Use montos enteros en CLP, sin decimales ni coma." };
  if (!/^\d+(\.\d{3})*$/.test(t))
    return {
      ok: false,
      motivo: "Monto inválido: use enteros con punto de miles opcional (ej. 1.234.567).",
    };
  const monto = Number(t.replace(/\./g, ""));
  if (!Number.isSafeInteger(monto) || monto < 0 || monto > 2_000_000_000)
    return { ok: false, motivo: "Monto fuera de rango permitido." };
  return { ok: true, monto };
}

export function parsearCsv(texto: string): Record<string, string>[] {
  const lineas = texto
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lineas.length < 2) throw reglaDeNegocio("La planilla CSV debe tener encabezado y al menos una fila.");
  const sep = lineas[0]?.includes(";") && !lineas[0]?.includes(",") ? ";" : ",";
  const cols = (lineas[0] ?? "").split(sep).map((c) => c.trim().toLowerCase());
  return lineas.slice(1).map((linea) => {
    const vals = linea.split(sep).map((v) => v.trim());
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
  let semana: string;
  try {
    semana = lunesDe(semanaRaw);
  } catch {
    return { ok: false, motivo: `Fila ${filaNum}: semana inválida.` };
  }
  const seccion = (r.seccion ?? "").toLowerCase();
  if (seccion !== "ingreso" && seccion !== "egreso")
    return { ok: false, motivo: `Fila ${filaNum}: sección inválida (use ingreso o egreso).` };
  const montoParse = parsearMontoClp(r.monto ?? "0");
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
