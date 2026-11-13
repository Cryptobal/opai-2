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

/** Una lectura es «lista» si devuelve un arreglo o su último segmento es list/listar (…_list, …_listar). */
export function esLista(id: string, output: z.ZodType): boolean {
  const segmento = id.split(".").at(-1) ?? "";
  return (
    desenvolver(output) instanceof z.ZodArray || /^(list|listar)$|_(list|listar)$/.test(segmento)
  );
}

/** Qué le falta a una capacidad de lista para cumplir el contrato (vacío = cumple). */
export function faltasDelContrato(input: z.ZodType, output: z.ZodType): string[] {
  const entrada = campos(input);
  const salida = campos(output);
  const faltas: string[] = [];
  if (!entrada["cursor"]) faltas.push("entrada sin cursor");
  const limite = entrada["limite"] ? desenvolver(entrada["limite"]) : undefined;
  if (!(limite instanceof z.ZodNumber)) faltas.push("entrada sin limite");
  else if (limite.maxValue === null || limite.maxValue > TOPE_LIMITE)
    faltas.push("limite sin tope");
  const items = salida["items"] ? desenvolver(salida["items"]) : undefined;
  if (!(items instanceof z.ZodArray)) faltas.push("salida sin items");
  if (!salida["siguiente"]) faltas.push("salida sin siguiente");
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
