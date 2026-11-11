// Guardia del ambiente del CAF: un CAF de otro ambiente nunca se usa para emitir (CAR-196). Desde CAR-240 la emisión
// simulada tampoco usa CAF de producción: los folios de producción solo se gastan emitiendo de verdad en producción.

import { cafCompatibleConAmbiente, type AmbienteCaf } from "@opai/domain";
import { ambienteTributarioEfectivo } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";

type CfgAmbiente = { ambiente?: string | null; emisionProveedor?: string | null } | null | undefined;
type Rango = { cafAmbiente?: string | null; cafIdk?: string | null; folioDesde: number; folioHasta: number };

export const NOMBRE_AMBIENTE_CAF: Record<AmbienteCaf, string> = { certificacion: "certificación", produccion: "producción" };

/** Ambiente en que realmente se emite (el candado CAR-191 lo fuerza a certificación fuera de app.opai.cl). */
export const ambienteEmisionDe = (cfg: CfgAmbiente): AmbienteCaf => ambienteTributarioEfectivo(cfg?.ambiente);

/** El modo simulado no envía nada al SII. */
export const emisionSimulada = (cfg: CfgAmbiente): boolean => (cfg?.emisionProveedor ?? "simulado") === "simulado";

/** Ambiente que debe tener el CAF para emitir: el de la emisión, y en simulado siempre certificación (CAR-240). */
export const ambienteCafRequerido = (cfg: CfgAmbiente): AmbienteCaf =>
  emisionSimulada(cfg) ? "certificacion" : ambienteEmisionDe(cfg);

export function mensajeCafAmbiente(r: Rango, ambiente: AmbienteCaf): string | null {
  const c = cafCompatibleConAmbiente(r, ambiente);
  if (c.ok) return null;
  const rango = `${r.folioDesde}–${r.folioHasta}`;
  const nombre = NOMBRE_AMBIENTE_CAF[ambiente];
  return c.motivo === "distinto"
    ? `El CAF ${rango} es de otro ambiente que la emisión (${nombre}); cargue un CAF de ${nombre}.`
    : `No se pudo determinar el ambiente del CAF ${rango} por su IDK; no se usa hasta confirmarlo.`;
}

/** El rango sirve para la emisión configurada (ambiente requerido, también en simulado). */
export const cafSirveParaEmitir = (cfg: CfgAmbiente, r: Rango): boolean =>
  mensajeCafAmbiente(r, ambienteCafRequerido(cfg)) == null;

/** Lanza si el rango no corresponde al ambiente requerido. */
export function exigirCafDelAmbiente(cfg: CfgAmbiente, r: Rango): void {
  const msg = mensajeCafAmbiente(r, ambienteCafRequerido(cfg));
  if (msg) throw reglaDeNegocio(msg);
}

/** Hay CAF activos con folios, pero ninguno del ambiente requerido: error claro, nunca se usa otro. */
export function errorSinCafDelAmbiente(cfg: CfgAmbiente, tipoDte: number): Error {
  const nombre = NOMBRE_AMBIENTE_CAF[ambienteCafRequerido(cfg)];
  const simulado = emisionSimulada(cfg) ? " La emisión simulada solo usa CAF de certificación." : "";
  return reglaDeNegocio(
    `No hay un CAF activo de ${nombre} para el DTE ${tipoDte}: los CAF activos son de otro ambiente o de ambiente sin determinar.${simulado} Cargue o reactive un CAF de ${nombre}.`,
  );
}
