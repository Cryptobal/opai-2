import { reglaDeNegocio } from "@opai/capabilities";

import { lunesDe } from "../domain";

export { filaImportSchema, MAX_FILAS_IMPORT } from "./importar-esquema";

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
    const semanaRaw = r.semana ?? r.lunes ?? "";
    if (!semanaRaw) throw reglaDeNegocio(`Fila ${indice + 2}: falta la semana.`);
    const semana = lunesDe(semanaRaw);
    const seccion = (r.seccion ?? "").toLowerCase();
    if (seccion !== "ingreso" && seccion !== "egreso")
      throw reglaDeNegocio(`Fila ${indice + 2}: sección inválida (use ingreso o egreso).`);
    const montoTxt = (r.monto ?? "0").replace(/\./g, "").replace(",", ".");
    return {
      seccion: seccion as "ingreso" | "egreso",
      etiqueta: r.etiqueta ?? r.fila ?? "",
      semana,
      monto: Number(montoTxt),
      nota: r.nota || undefined,
      vinculo: r.vinculo || undefined,
    };
  });
}
