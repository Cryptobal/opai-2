// Resolución SII del emisor: el número 0 es válido solo en certificación (CAR-196).

import type { AmbienteSii } from "@opai/integrations";

/**
 * El SII asigna la resolución número 0 a quien se certifica. En producción debe ser un número mayor que 0.
 * `ambiente` es el configurado por la empresa (no el efectivo): ante «producción» se exige siempre >0, falla cerrado.
 */
export function resolucionSiiValida(
  ambiente: AmbienteSii | string | null | undefined,
  numero: number | null | undefined,
): boolean {
  if (numero == null || !Number.isInteger(numero) || numero < 0) return false;
  return ambiente === "produccion" ? numero > 0 : true;
}

type Push = (codigo: string, ok: boolean, mensaje: string, bloqueante: boolean) => void;
type CfgResolucion = {
  ambiente?: string | null;
  resolucionSiiNumero: number | null;
  resolucionSiiFecha: Date | null;
} | null;

/** Resultado del chequeo previo «resolución SII»; `dia` formatea la fecha para el mensaje. */
export function chequeoResolucionSii(
  proveedor: string,
  cfg: CfgResolucion,
  dia: (d: Date) => string | null,
  push: Push,
): void {
  if (cfg?.resolucionSiiFecha && resolucionSiiValida(cfg.ambiente, cfg.resolucionSiiNumero)) {
    push("resolucion_sii", true, `Resolución SII N° ${cfg.resolucionSiiNumero} del ${dia(cfg.resolucionSiiFecha)}.`, false);
  } else if (proveedor !== "simulado" && cfg?.ambiente === "produccion" && cfg.resolucionSiiNumero === 0) {
    push("resolucion_sii", false, "La resolución 0 solo existe en certificación; en producción indique la resolución vigente.", true);
  } else if (proveedor !== "simulado") {
    push("resolucion_sii", false, "Indique número y fecha de resolución SII del emisor.", true);
  } else {
    push("resolucion_sii", true, "Resolución SII no requerida en modo simulado.", false);
  }
}
