import { finSemanaIso } from "@opai/domain";

import type { SemanaFlujo } from "./datos";
import { clp, fechaDdMmAaaa } from "./datos";

export type SaldoSugeridoCierre = {
  saldo: number | null;
  fechaCorte: string | null;
  aviso: string | null;
  cuentaIds: string[];
  origenes: { banco: string; numeroVisible: string; cartolaFecha: string | null }[];
};

/** Solo precarga cuando la API trae saldo; nunca devuelve vacío para no borrar lo que escribió el usuario. */
export function saldoInicialDesdeSugerido(saldo: number | null | undefined): string | undefined {
  return saldo != null ? String(saldo) : undefined;
}

export function puedeVistaPreviaCierre(input: {
  semana: string;
  banco: string;
  pendiente: boolean;
}): boolean {
  if (input.pendiente || !input.semana.trim()) return false;
  const n = Number(input.banco.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n);
}

const mesCorto = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("es-CL", { month: "short" }).replace(/\./g, "").trim();
};

/** «Semana del 2 al 8 nov» (es-CL legible, no ISO). */
export function etiquetaSemanaCierre(s: SemanaFlujo): string {
  const fin = finSemanaIso(s.semana);
  const iniD = new Date(`${s.semana}T12:00:00Z`).getUTCDate();
  const finD = new Date(`${fin}T12:00:00Z`).getUTCDate();
  const mIni = mesCorto(s.semana);
  const mFin = mesCorto(fin);
  const rango =
    mIni === mFin ? `Semana del ${iniD} al ${finD} ${mFin}` : `Semana del ${iniD} ${mIni} al ${finD} ${mFin}`;
  const sellada = s.sellada ? " · sellada" : "";
  return `${rango}${sellada} · ${clp(s.saldoFinal)}`;
}

function ultimosDigitos(numero: string): string {
  const d = numero.replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : numero;
}

export function ayudaProcedenciaSaldo(meta: SaldoSugeridoCierre | null): string {
  if (!meta) return "";
  if (!meta.cuentaIds.length) {
    return "Sin cuentas bancarias configuradas; escribe el saldo del banco.";
  }
  if (!meta.origenes.length) {
    return "Sin cartola importada para esta semana; escribe el saldo del banco.";
  }
  return meta.origenes
    .map(
      (o) =>
        `Sugerido desde ${o.banco} ·${ultimosDigitos(o.numeroVisible)}${
          o.cartolaFecha ? `, cartola del ${fechaDdMmAaaa(o.cartolaFecha)}` : ""
        }`,
    )
    .join(" · ");
}
