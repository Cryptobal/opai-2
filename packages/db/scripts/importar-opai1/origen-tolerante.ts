// Validación tolerante del origen (regla de Carlos, 4-nov-2026): un dato malo de 1.0 nunca detiene la carga.
// Un campo inválido se deja vacío y una fila irrecuperable se descarta; ambos quedan como advertencia
// (recurso, fila y campo; nunca el valor, Ley 21.719).
import type { z } from "zod";

import { datosOpai1, type DatosOpai1 } from "./origen";

export type Advertencia = DatosOpai1["advertencias"][number];

const RECURSOS = [
  "accounts",
  "contacts",
  "installations",
  "pipelineStages",
  "deals",
  "dealStageHistory",
  "dealContacts",
  "recurringInvoiceSchedules",
  "cpqQuotes",
  "activities",
  "users",
] as const;

type Recurso = (typeof RECURSOS)[number];
type Fila = Record<string, unknown>;
const esFila = (v: unknown): v is Fila => typeof v === "object" && v !== null && !Array.isArray(v);

function esquemaFila(recurso: Recurso): z.ZodType {
  return datosOpai1.shape[recurso].unwrap().element as z.ZodType;
}

/** Valida una fila; vacía los campos inválidos (o el elemento de lista) y reintenta; si no hay arreglo, la descarta. */
function validarFila(
  recurso: Recurso,
  cruda: unknown,
  indice: number,
  avisos: Advertencia[],
): unknown {
  const esquema = esquemaFila(recurso);
  const id = esFila(cruda) && typeof cruda["id"] === "string" ? cruda["id"] : `#${indice}`;
  const aviso = (codigo: string, campo: string) =>
    avisos.push({ codigo, recurso, idOpai1: id, campo });
  if (!esFila(cruda)) {
    aviso("fila_descartada", "-");
    return undefined;
  }
  const fila: Fila = { ...cruda };
  const vaciados = new Set<string>();
  for (let intento = 0; intento < 40; intento++) {
    const r = esquema.safeParse(fila);
    if (r.success) return r.data;
    const issue = r.error.issues[0];
    const campo = typeof issue?.path[0] === "string" ? issue.path[0] : null;
    if (!issue || campo === null || campo === "id") break;
    const hijo = issue.path[1];
    const lista = fila[campo];
    if (typeof hijo === "number" && Array.isArray(lista)) {
      fila[campo] = lista.filter((_, i) => i !== hijo);
      aviso(
        "elemento_descartado",
        `${campo}[${hijo}]${typeof issue.path[2] === "string" ? `.${issue.path[2]}` : ""}`,
      );
      continue;
    }
    if (vaciados.has(campo)) break;
    vaciados.add(campo);
    delete fila[campo];
    aviso("campo_vaciado", campo);
  }
  aviso("fila_descartada", "-");
  return undefined;
}

export function validarTolerante(crudo: unknown): DatosOpai1 {
  if (!esFila(crudo))
    throw new Error("Origen inválido: se esperaba un objeto con las listas de 1.0");
  const avisos: Advertencia[] = [];
  const base: Record<string, unknown> = {};
  for (const recurso of RECURSOS) {
    const lista = crudo[recurso];
    const filas = Array.isArray(lista) ? lista : [];
    base[recurso] = filas
      .map((f, i) => validarFila(recurso, f, i, avisos))
      .filter((f) => f !== undefined);
  }
  const previas = Array.isArray(crudo["advertencias"])
    ? (crudo["advertencias"] as Advertencia[])
    : [];
  return datosOpai1.parse({ ...base, advertencias: [...previas, ...avisos] });
}
