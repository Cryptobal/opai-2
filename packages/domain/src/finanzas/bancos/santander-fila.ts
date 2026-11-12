// Una fila del detalle de la cartola Santander (CAR-327, CAR-341). Cada rechazo explica qué se leyó y por qué
// no es un movimiento, para que la vista previa lo muestre tal cual.
import { claveDedupeCartola } from "./dedupe";
import { fechaDesdeDdMmAaaa } from "./fechas";
import { esRemuneracion } from "./remuneracion";
import { montoConSigno, type ColumnasCartola } from "./santander-columnas";
import { enteroPesos, type CeldaCartola } from "./santander-secciones";

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

const mostrar = (v: CeldaCartola | undefined) => {
  const t = String(v ?? "").trim();
  return t ? `«${t.length > 30 ? `${t.slice(0, 30)}…` : t}»` : "vacía";
};

/** Monto de pesos de la celda. Los pesos no tienen decimales: un decimal es otra sección mal leída. */
export function montoDetalle(v: CeldaCartola | undefined): { ok: true; monto: number } | { ok: false; motivo: string } {
  if (v == null || v === "") return { ok: false, motivo: "Sin monto: la celda MONTO está vacía." };
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return { ok: false, motivo: `El monto ${mostrar(String(v))} no es un número.` };
    if (!Number.isInteger(v)) {
      return { ok: false, motivo: `El monto ${mostrar(String(v))} trae decimales; en pesos no hay decimales.` };
    }
    return v === 0 ? { ok: false, motivo: "Monto en cero: no es un movimiento." } : { ok: true, monto: v };
  }
  const t = v.replace(/[−–]/g, "-").replace(/\$/g, "").replace(/\s/g, "");
  if (!/^-?\d{1,3}(\.\d{3})*$|^-?\d+$/.test(t)) {
    return { ok: false, motivo: `El monto ${mostrar(v)} no es un entero de pesos (ej.: 1.234.567).` };
  }
  const n = Number(t.replace(/\./g, ""));
  return n === 0 ? { ok: false, motivo: "Monto en cero: no es un movimiento." } : { ok: true, monto: n };
}

export function filaDetalleSantander(
  row: readonly CeldaCartola[],
  cols: ColumnasCartola,
  indice: number,
): { ok: true; fila: FilaCartolaParseada } | { ok: false; motivo: string } {
  const fechaRaw = row[cols.fecha];
  const iso = fechaRaw == null ? null : fechaDesdeDdMmAaaa(String(fechaRaw));
  if (!iso) return { ok: false, motivo: `La fecha ${mostrar(fechaRaw)} no tiene el formato dd/mm/aaaa.` };
  const leido = montoDetalle(row[cols.monto]);
  if (!leido.ok) return leido;
  const monto = montoConSigno(leido.monto, cols.cargoAbono != null ? row[cols.cargoAbono] : null);
  const glosa = String(row[cols.glosa] ?? "").trim();
  if (!glosa) return { ok: false, motivo: "Sin descripción del movimiento." };
  const texto = (j: number | undefined) => (j != null ? String(row[j] ?? "").trim() || null : null);
  return {
    ok: true,
    fila: {
      indice,
      fecha: iso,
      monto,
      glosa,
      referencia: texto(cols.ref),
      sucursal: texto(cols.suc),
      saldoDespues: cols.saldo != null ? enteroPesos(row[cols.saldo]) : null,
      claveDedupe: claveDedupeCartola({ fecha: iso, monto, glosa }),
      esRemuneracion: esRemuneracion(glosa),
    },
  };
}
