/** Límites de jornada (Ley 21.561 / DS 48): aviso 40 h, tope 42 h semanales, 12 h diarias y 2 h extra diarias. */

export type LimitesJornada = {
  vigenteDesde: string;
  avisoSemanalHoras: number;
  maxSemanalHoras: number;
  maxDiarioHoras: number;
  maxExtraDiarioHoras: number;
};

export const LIMITES_JORNADA_DEFECTO: LimitesJornada = {
  vigenteDesde: "2024-04-26",
  avisoSemanalHoras: 40,
  maxSemanalHoras: 42,
  maxDiarioHoras: 12,
  maxExtraDiarioHoras: 2,
};

export type TopeLimite = "semanal_aviso" | "semanal" | "diario" | "extra_diario";

const horas = (h: number) => h * 60;

/** Devuelve qué topes se superan hoy (puede ser más de uno; el llamador emite un aviso por tope con clave distinta). */
export function limitesSuperados(
  cfg: LimitesJornada,
  fecha: string,
  minutosDia: number,
  minutosSemana: number,
  minutosExtraDia: number,
): TopeLimite[] {
  if (fecha < cfg.vigenteDesde) return [];
  const aviso = horas(cfg.avisoSemanalHoras);
  const maxSem = horas(cfg.maxSemanalHoras);
  const maxDia = horas(cfg.maxDiarioHoras);
  const maxExt = horas(cfg.maxExtraDiarioHoras);
  const topes: TopeLimite[] = [];
  if (minutosSemana >= aviso && minutosSemana < maxSem) topes.push("semanal_aviso");
  if (minutosSemana >= maxSem) topes.push("semanal");
  if (minutosDia > maxDia) topes.push("diario");
  if (minutosExtraDia > maxExt) topes.push("extra_diario");
  return topes;
}

/** Lunes de la semana ISO (fecha YYYY-MM-DD en zona de la empresa). */
export function lunesDeSemana(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = d.getUTCDay();
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}