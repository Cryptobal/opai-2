import { diasDelMes } from "./periodo";
import type { ModoAnticipo } from "./tipos";

export type ReglaAnticipo = {
  personaId: string;
  activa: boolean;
  modo: ModoAnticipo;
  /** CLP para `monto_fijo`; puntos base (1% = 100) del sueldo base para `porcentaje_base`. */
  valor: number;
  /** Día del mes en que se paga el anticipo (1–31); si el mes es más corto, el último día. */
  diaMes: number;
};

export type AnticipoGenerado = { personaId: string; fecha: string; monto: number };
export type AnticipoOmitido = { personaId: string; motivo: "inactiva" | "requiere_sueldo_base" | "monto_invalido" };

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha del anticipo del mes, con el día acotado al último día del mes (31 en febrero → 28/29). */
export function fechaAnticipoQuincenal(anio: number, mes: number, diaMes: number): string {
  const dia = Math.min(Math.max(Math.trunc(diaMes), 1), diasDelMes(anio, mes));
  return `${anio}-${pad(mes)}-${pad(dia)}`;
}

/**
 * Anticipos del período a partir de las reglas (B2). Solo las reglas activas de monto fijo generan
 * un anticipo; las de porcentaje se omiten con motivo hasta que el motor de sueldos entregue el sueldo
 * base de la capa (PR 2). Función pura: no consulta ni escribe.
 */
export function anticiposDelPeriodo(
  reglas: readonly ReglaAnticipo[],
  anio: number,
  mes: number,
): { generados: AnticipoGenerado[]; omitidos: AnticipoOmitido[] } {
  const generados: AnticipoGenerado[] = [];
  const omitidos: AnticipoOmitido[] = [];
  for (const r of reglas) {
    if (!r.activa) omitidos.push({ personaId: r.personaId, motivo: "inactiva" });
    else if (r.modo === "porcentaje_base")
      omitidos.push({ personaId: r.personaId, motivo: "requiere_sueldo_base" });
    else if (!Number.isSafeInteger(r.valor) || r.valor <= 0)
      omitidos.push({ personaId: r.personaId, motivo: "monto_invalido" });
    else
      generados.push({
        personaId: r.personaId,
        fecha: fechaAnticipoQuincenal(anio, mes, r.diaMes),
        monto: r.valor,
      });
  }
  return { generados, omitidos };
}
