// CAR-353 (Estándares N-2): contrato único de las capacidades de lista, verificado sobre el registro.
// Entrada: `cursor` (opcional) y `limite` con tope ≤ TOPE_LIMITE. Salida: `{ items: [...], siguiente }`.
import { z } from "zod";

import { listarCapacidades } from "@opai/capabilities";

export const TOPE_LIMITE = 200;

const desenvolver = (s: z.ZodType): z.ZodType => {
  if (s instanceof z.ZodOptional || s instanceof z.ZodNullable)
    return desenvolver(s.unwrap() as z.ZodType);
  if (s instanceof z.ZodDefault) return desenvolver(s.unwrap() as z.ZodType);
  return s;
};

const campos = (s: z.ZodType): Record<string, z.ZodType> => {
  const o = desenvolver(s);
  return o instanceof z.ZodObject ? (o.shape as Record<string, z.ZodType>) : {};
};

/**
 * Una lectura es «lista» si devuelve un arreglo, si su salida trae `items` o si su último segmento
 * nombra una lista (list/listar como palabra: `list`, `…_listar`, `list_a_cargo`).
 */
export function esLista(id: string, output: z.ZodType): boolean {
  const segmento = id.split(".").at(-1) ?? "";
  return (
    desenvolver(output) instanceof z.ZodArray ||
    (!/^(get|obtener)($|_)/.test(segmento) && "items" in campos(output)) ||
    /(^|_)(list|listar)($|_)/.test(segmento)
  );
}

const faltasDeEntrada = (entrada: Record<string, z.ZodType>): string[] => {
  const faltas: string[] = [];
  const cursor = entrada["cursor"];
  if (!cursor) faltas.push("entrada sin cursor");
  else if (!cursor.safeParse(undefined).success || desenvolver(cursor).def.type !== "string") {
    faltas.push("cursor no es texto opcional");
  }
  const limite = entrada["limite"] ? desenvolver(entrada["limite"]) : undefined;
  if (!(limite instanceof z.ZodNumber)) faltas.push("entrada sin limite");
  else if (limite.maxValue === null || limite.maxValue > TOPE_LIMITE)
    faltas.push("limite sin tope");
  else if (!limite.isInt || limite.minValue === null || limite.minValue < 1) {
    faltas.push("limite no es entero ≥ 1");
  }
  return faltas;
};

/** Qué le falta a una capacidad de lista para cumplir el contrato (vacío = cumple). */
export function faltasDelContrato(input: z.ZodType, output: z.ZodType): string[] {
  const salida = campos(output);
  const faltas = faltasDeEntrada(campos(input));
  const items = salida["items"] ? desenvolver(salida["items"]) : undefined;
  if (!(items instanceof z.ZodArray)) faltas.push("salida sin items");
  const siguiente = salida["siguiente"];
  if (!siguiente) faltas.push("salida sin siguiente");
  else if (!siguiente.safeParse(null).success) faltas.push("siguiente no admite null");
  return faltas;
}

/** Capacidades de lista del registro (lecturas) con lo que les falta para cumplir el contrato. */
export function listasDelRegistro(): { id: string; faltas: string[] }[] {
  return listarCapacidades()
    .filter((c) => c.efecto === "lectura" && esLista(c.id, c.output as z.ZodType))
    .map((c) => ({
      id: c.id,
      faltas: faltasDelContrato(c.input as z.ZodType, c.output as z.ZodType),
    }));
}
