// Guardia del ambiente del CAF: un CAF de otro ambiente nunca se usa para emitir (CAR-196).

import { cafCompatibleConAmbiente, type AmbienteCaf } from "@opai/domain";
import { ambienteTributarioEfectivo } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";

type CfgAmbiente = { ambiente?: string | null; emisionProveedor?: string | null } | null | undefined;
type Rango = { cafAmbiente?: string | null; cafIdk?: string | null; folioDesde: number; folioHasta: number };

/** Ambiente en que realmente se emite (el candado CAR-191 lo fuerza a certificación fuera de app.opai.cl). */
export const ambienteEmisionDe = (cfg: CfgAmbiente): AmbienteCaf => ambienteTributarioEfectivo(cfg?.ambiente);

/** El modo simulado no usa el CAF ante el SII: no hay ambiente que proteger. */
export const emisionSimulada = (cfg: CfgAmbiente): boolean => (cfg?.emisionProveedor ?? "simulado") === "simulado";

export function mensajeCafAmbiente(r: Rango, ambiente: AmbienteCaf): string | null {
  const c = cafCompatibleConAmbiente(r, ambiente);
  if (c.ok) return null;
  const rango = `${r.folioDesde}–${r.folioHasta}`;
  return c.motivo === "distinto"
    ? `El CAF ${rango} es de otro ambiente que la emisión (${ambiente}); cargue un CAF de ${ambiente}.`
    : `No se pudo determinar el ambiente del CAF ${rango} por su IDK; no se usa hasta confirmarlo.`;
}

/** Lanza si el rango no corresponde al ambiente de emisión. No hace nada en emisión simulada. */
export function exigirCafDelAmbiente(cfg: CfgAmbiente, r: Rango): void {
  if (emisionSimulada(cfg)) return;
  const msg = mensajeCafAmbiente(r, ambienteEmisionDe(cfg));
  if (msg) throw reglaDeNegocio(msg);
}
