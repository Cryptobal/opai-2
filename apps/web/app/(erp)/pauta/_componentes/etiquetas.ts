import type { Motivo } from "./tipos";

export const MOTIVO: Record<Motivo, string> = {
  sin_titular: "Sin titular",
  ausencia: "Ausencia",
  licencia: "Licencia médica",
  vacaciones: "Vacaciones",
  permiso: "Permiso",
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

export const nombreMes = (anio: number, mes: number) => `${MESES[mes - 1]} de ${anio}`;
export const diaSemana = (fecha: string) => DIAS_CORTOS[new Date(`${fecha}T00:00:00Z`).getUTCDay()]!;
/** "aaaa-mm-dd" → "dd-mm-aaaa" (español de Chile). */
export const fechaCl = (f: string) => `${f.slice(8, 10)}-${f.slice(5, 7)}-${f.slice(0, 4)}`;
export const pct = (x: number | null) => (x === null ? "—" : `${x.toFixed(1).replace(".", ",")} %`);

/** Un turno que empieza de tarde o de madrugada es de noche (código N del diseño). */
export function esNoche(horario: string): boolean {
  const h = Number(horario.slice(0, 2));
  return h >= 18 || h < 6;
}

export function mesVecino(anio: number, mes: number, delta: number) {
  const d = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

export const claveMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, "0")}`;
