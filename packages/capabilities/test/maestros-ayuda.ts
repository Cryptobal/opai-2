import { randomUUID } from "node:crypto";

import { type Entorno } from "../../db/test/entorno";
import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import type { Contexto } from "../src/types";

export function reiniciar() {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
}

/** Ejecuta y devuelve `data`; si falla, lanza con el error para que el test lo muestre. */
export async function dato<T = Record<string, unknown>>(
  ctx: Contexto,
  id: string,
  input: unknown,
  opciones: { dryRun?: boolean; idempotencyKey?: string } = {},
): Promise<T> {
  const r = await executeCapability(ctx, id, input, opciones);
  if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
  return r.data as T;
}

export const codigo = async (
  ctx: Contexto,
  id: string,
  input: unknown,
  opciones: { dryRun?: boolean; idempotencyKey?: string } = {},
) => {
  const r = await executeCapability(ctx, id, input, opciones);
  return r.ok ? "OK" : r.error.code;
};

/** Contrato vigente con instalación de imputación (vía `forTenant`, mismo criterio que capacidades de inventario). */
export async function sembrarContratoVigente(
  e: Entorno,
  tenantId: string,
  personaId: string,
  instalacionId?: string,
): Promise<{ instalacionId: string; cargoId: string }> {
  const db = e.forTenant(tenantId);
  let destino = instalacionId;
  if (!destino) {
    const cuenta = await db.cuenta.create({ data: { tenantId, nombre: `Cuenta ${randomUUID().slice(0, 6)}` } });
    destino = (await db.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre: "Planta" } })).id;
  }
  const cargoId = (await db.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
  await db.vinculoLaboral.create({
    data: {
      tenantId,
      personaId,
      cargoId,
      instalacionId: destino,
      tipo: "indefinido",
      inicio: new Date("2026-01-01"),
      estado: "vigente",
      horasSemanales: 44,
      distribucion: "4x4",
    },
  });
  return { instalacionId: destino, cargoId };
}
