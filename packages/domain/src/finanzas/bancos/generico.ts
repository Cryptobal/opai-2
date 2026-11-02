import { claveDedupe } from "./dedupe";
import { fechaDesdeDdMmAaaa } from "./fechas";
import { esRemuneracion } from "./remuneracion";
import type { FilaCartolaParseada } from "./santander";

export type MapeoColumnasGenerico = {
  fecha: string;
  monto: string;
  glosa: string;
  referencia?: string;
  sucursal?: string;
  saldo?: string;
};

export function parsearCsvGenerico(
  contenido: string,
  mapeo: MapeoColumnasGenerico,
): { filas: FilaCartolaParseada[]; rechazadas: { indice: number; motivo: string }[] } {
  const lineas = contenido.split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return { filas: [], rechazadas: [] };
  const header = lineas[0];
  if (!header) return { filas: [], rechazadas: [] };
  const sep = header.includes(";") ? ";" : ",";
  const headers = header.split(sep).map((h) => h.trim());
  const idx = (nombre: string) => headers.findIndex((h) => h.toLowerCase() === nombre.toLowerCase());
  const cols = {
    fecha: idx(mapeo.fecha),
    monto: idx(mapeo.monto),
    glosa: idx(mapeo.glosa),
    ref: mapeo.referencia ? idx(mapeo.referencia) : -1,
    suc: mapeo.sucursal ? idx(mapeo.sucursal) : -1,
    saldo: mapeo.saldo ? idx(mapeo.saldo) : -1,
  };
  const filas: FilaCartolaParseada[] = [];
  const rechazadas: { indice: number; motivo: string }[] = [];
  for (let i = 1; i < lineas.length; i += 1) {
    const cells = lineas[i]?.split(sep) ?? [];
    const iso = fechaDesdeDdMmAaaa(cells[cols.fecha] ?? "") ?? cells[cols.fecha]?.trim().slice(0, 10) ?? null;
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      rechazadas.push({ indice: i, motivo: "Fecha inválida." });
      continue;
    }
    const monto = parseMonto(cells[cols.monto]);
    if (monto == null || monto === 0) {
      rechazadas.push({ indice: i, motivo: "Monto inválido." });
      continue;
    }
    const glosa = (cells[cols.glosa] ?? "").trim();
    if (!glosa) {
      rechazadas.push({ indice: i, motivo: "Glosa vacía." });
      continue;
    }
    const referencia = cols.ref >= 0 ? (cells[cols.ref] ?? "").trim() || null : null;
    const sucursal = cols.suc >= 0 ? (cells[cols.suc] ?? "").trim() || null : null;
    const saldoDespues = cols.saldo >= 0 ? parseMonto(cells[cols.saldo]) : null;
    filas.push({
      indice: i,
      fecha: iso,
      monto,
      glosa,
      referencia,
      sucursal,
      saldoDespues,
      claveDedupe: claveDedupe({ fecha: iso, monto, glosa, referencia }),
      esRemuneracion: esRemuneracion(glosa),
    });
  }
  return { filas, rechazadas };
}

function parseMonto(v: string | undefined): number | null {
  if (!v) return null;
  const t = v.replace(/\$/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}
