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
