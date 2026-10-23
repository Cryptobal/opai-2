import type { z } from "zod";

import type { Capacidad } from "./types";

const ID_VALIDO = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,2}$/;

type Definicion<I extends z.ZodType, O extends z.ZodType> = Omit<Capacidad<I, O>, "modulo">;

/**
 * Declara una capacidad de negocio (ADR-004). Es la única forma de exponer lógica a UI, API y MCP.
 * Valida el id y la coherencia efecto/dryRun en el momento de la declaración, no en runtime.
 */
export function defineCapability<I extends z.ZodType, O extends z.ZodType>(
  def: Definicion<I, O>,
): Capacidad<I, O> {
  if (!ID_VALIDO.test(def.id)) {
    throw new Error(
      `Id de capacidad inválido "${def.id}": usa <modulo>.<entidad>.<verbo> o <modulo>.<verbo> en minúsculas.`,
    );
  }
  if (def.efecto !== "lectura" && !def.dryRun) {
    throw new Error(`La capacidad "${def.id}" escribe datos y debe soportar dryRun.`);
  }
  const modulo = def.id.split(".")[0] as string;
  return { ...def, modulo };
}
