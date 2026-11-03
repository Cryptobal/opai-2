// Completitud de datos tributarios de cuenta para Finanzas › Ventas DTE (CAR-140, importación 1.0).
import { rutValido } from "@opai/domain";

import type { DatosCuenta } from "./cuentas";

/** Campos obligatorios para emitir DTE manual con datos del cliente (sin inventar defaults). */
export const CAMPOS_TRIBUTARIOS = [
  "rut",
  "razon_social",
  "giro",
  "calle",
  "comuna",
  "ciudad",
  "email_dte",
] as const;

export type CampoTributario = (typeof CAMPOS_TRIBUTARIOS)[number];

export function faltantesTributarios(d: DatosCuenta): CampoTributario[] {
  const f: CampoTributario[] = [];
  if (!d.rut || !rutValido(d.rut)) f.push("rut");
  if (!d.razonSocial) f.push("razon_social");
  if (!d.giro) f.push("giro");
  if (!d.calle) f.push("calle");
  if (!d.comuna) f.push("comuna");
  if (!d.ciudad) f.push("ciudad");
  if (!d.emailDte) f.push("email_dte");
  return f;
}

export function tributarioCompleto(d: DatosCuenta): boolean {
  return faltantesTributarios(d).length === 0;
}

/** Lista para facturación manual: RUT válido y datos tributarios completos. */
export function cuentaListaParaFacturar(d: DatosCuenta): boolean {
  return tributarioCompleto(d);
}
