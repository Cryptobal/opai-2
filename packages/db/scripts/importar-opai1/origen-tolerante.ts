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

const MONTOS = new Set([
  "amount",
  "quantity",
  "unitPrice",
  "unitPriceUf",
  "discountPct",
  "price",
  "total",
]);

/** Solo se puede vaciar un opcional sin valor por defecto que no sea monto, lista ni referencias. */
function sePuedeVaciar(recurso: Recurso, campo: string, valor: unknown): boolean {
  if (MONTOS.has(campo) || Array.isArray(valor)) return false;
  const def = (
    esquemaFila(recurso) as unknown as { shape?: Record<string, { def?: { type?: string } }> }
  ).shape?.[campo];
  return def?.def?.type !== "default";
}

/**
 * Valida una fila. Un opcional sin valor por defecto (rut, correo…) con dato malo queda vacío. Si el campo es
 * un monto, una lista, o tiene valor por defecto, vaciarlo inventaría un dato: se descarta la fila completa.
 */
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
  const vaciados: Advertencia[] = [];
  let culpable = "-";
  for (let intento = 0; intento < 40; intento++) {
    const r = esquema.safeParse(fila);
    if (r.success) {
      avisos.push(...vaciados);
      return r.data;
    }
    const campo = r.error.issues[0]?.path[0];
    if (typeof campo !== "string") break;
    culpable = campo;
    if (
      campo === "id" ||
      !sePuedeVaciar(recurso, campo, fila[campo]) ||
      vaciados.some((v) => v.campo === campo)
    )
      break;
    delete fila[campo];
    vaciados.push({ codigo: "campo_vaciado", recurso, idOpai1: id, campo });
  }
  aviso("fila_descartada", culpable);
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
