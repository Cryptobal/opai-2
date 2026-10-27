import type { z } from "zod";

import type { Capacidad } from "./types";

/** Mínimo de la descripción: es lo que un modelo lee para elegir la herramienta (ADR-034). */
export const DESCRIPCION_MINIMA = 40;
const ID_VALIDO = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,2}$/;

type Definicion<I extends z.ZodType, O extends z.ZodType> = Omit<Capacidad<I, O>, "modulo">;

/**
 * Declara una capacidad de negocio (ADR-004). Es la única forma de exponer lógica a UI, API y MCP.
 * Valida el id, la coherencia efecto/dryRun y la descripción (ADR-034) al declarar, no en runtime.
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
  if (def.auditarLectura && (def.efecto !== "lectura" || def.sinTenant || def.tenantObjetivo)) {
    throw new Error(`La auditoría de lectura de "${def.id}" requiere lectura con tenant actual.`);
  }
  const largo = def.descripcion.trim().length;
  if (largo < DESCRIPCION_MINIMA) {
    throw new Error(
      `La capacidad "${def.id}" necesita una descripción en lenguaje de negocio de al menos ${DESCRIPCION_MINIMA} caracteres (tiene ${largo}). Ver ADR-034.`,
    );
  }
  const modulo = def.id.split(".")[0] as string;
  return { ...def, modulo };
}
