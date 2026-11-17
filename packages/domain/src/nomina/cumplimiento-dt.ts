import { sumarDias } from "../calendario/fechas";

/** Plazo legal para registrar contratos y anexos en Mi DT (Ley 21.327). */
export const PLAZO_MI_DT_DIAS = 15;

export const TIPOS_MOVIMIENTO_MI_DT = ["alta", "baja", "anexo", "finiquito"] as const;
export type TipoMovimientoMiDt = (typeof TIPOS_MOVIMIENTO_MI_DT)[number];

export const ETIQUETA_MOVIMIENTO_MI_DT: Record<TipoMovimientoMiDt, string> = {
  alta: "Alta",
  baja: "Baja",
  anexo: "Anexo",
  finiquito: "Finiquito",
};

/** Fecha límite civil (día 15 desde el hecho, inclusive del día 0). */
export function plazoMiDtHasta(hechoEn: string): string {
  return sumarDias(hechoEn, PLAZO_MI_DT_DIAS);
}

export type TonoPlazoMiDt = "success" | "warning" | "danger" | "neutral";

/** Texto y tono del plazo respecto a «hoy» (aaaa-mm-dd). */
export function etiquetaPlazoMiDt(hechoEn: string, hoy: string, registradoEn: string | null): { etiqueta: string; tono: TonoPlazoMiDt } {
  if (registradoEn) return { etiqueta: `Registrado el ${registradoEn}`, tono: "success" };
  const limite = plazoMiDtHasta(hechoEn);
  const diasRestantes = Math.round((Date.parse(`${limite}T00:00:00.000Z`) - Date.parse(`${hoy}T00:00:00.000Z`)) / 86_400_000);
  if (diasRestantes < 0) return { etiqueta: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? "" : "s"}`, tono: "danger" };
  if (diasRestantes === 0) return { etiqueta: "Vence hoy", tono: "danger" };
  if (diasRestantes === 1) return { etiqueta: "Queda 1 día", tono: "warning" };
  if (diasRestantes <= 5) return { etiqueta: `Quedan ${diasRestantes} días`, tono: "warning" };
  return { etiqueta: `Quedan ${diasRestantes} días`, tono: "neutral" };
}

/** Filas CSV de pendientes (formato por verificar ante Mi DT). */
export function csvMovimientosMiDt(
  filas: readonly { movimiento: string; rut: string; nombres: string; apellidos: string; hechoEn: string; plazoLimite: string; tipoContrato: string; referenciaId: string }[],
): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const cabecera = ["movimiento", "rut", "nombres", "apellidos", "fecha_hecho", "plazo_limite", "tipo_contrato", "referencia_id"];
  const lineas = filas.map((f) =>
    [f.movimiento, f.rut, f.nombres, f.apellidos, f.hechoEn, f.plazoLimite, f.tipoContrato, f.referenciaId].map(esc).join(","),
  );
  return [cabecera.join(","), ...lineas].join("\n");
}

export function nombreArchivoPendientesMiDt(): string {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `midt_pendientes_${hoy}.csv`;
}