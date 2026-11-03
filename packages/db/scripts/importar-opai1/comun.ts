// Tipos y utilidades compartidas del plan de importación (puro, sin base).
import { completarVacios } from "./completar-vacios";
import type { EntidadImportada, EstadoDestino } from "./destino-tipos";

export type Accion = "crear" | "actualizar" | "sin_cambios" | "conflicto" | "omitido";

/** Decisión sobre una fila de 1.0. `datos` (con datos personales) nunca sale al reporte. */
export type Decision<D> = {
  entidad: EntidadImportada;
  idOpai1: string;
  accion: Accion;
  motivo: string | null;
  /** Fila de 2.0 existente que se actualiza, se vincula o ya está mapeada. */
  destinoId: string | null;
  /** Fila canónica de 1.0 con la que se funde (duplicado determinista). */
  fusionaCon: string | null;
  /** Nombres de campos que se escriben (solo los vacíos en 2.0; nunca valores). */
  campos: string[];
  /** Campos con valores distintos en 1.0 y 2.0: se informan y no se escriben. */
  conflictos: string[];
  datos: D | null;
};

export type Propuesta = {
  entidad: EntidadImportada;
  criterio: string;
  idsOpai1: string[];
  idsDestino: string[];
};

export type Aviso = { codigo: string; idOpai1: string };

export function decision<D>(
  entidad: EntidadImportada,
  idOpai1: string,
  accion: Accion,
  extra: Partial<Omit<Decision<D>, "entidad" | "idOpai1" | "accion">> = {},
): Decision<D> {
  return {
    entidad,
    idOpai1,
    accion,
    motivo: extra.motivo ?? null,
    destinoId: extra.destinoId ?? null,
    fusionaCon: extra.fusionaCon ?? null,
    campos: extra.campos ?? [],
    conflictos: extra.conflictos ?? [],
    datos: extra.datos ?? null,
  };
}

/** Orden estable: fecha de creación de 1.0 y luego id. El mismo origen da siempre el mismo plan. */
export function ordenEstable<T extends { id: string; createdAt?: string }>(
  filas: readonly T[],
): T[] {
  const t = (f: T) => (f.createdAt ? Date.parse(f.createdAt) : 0);
  return [...filas].sort((a, b) => t(a) - t(b) || a.id.localeCompare(b.id));
}

/** Campos cuyo valor difiere (comparación estructural simple, arrays ordenados). */
export function camposDistintos<D extends Record<string, unknown>>(
  propuesto: D,
  actual: Record<string, unknown>,
): string[] {
  const norm = (v: unknown) => JSON.stringify(Array.isArray(v) ? [...v].sort() : (v ?? null));
  return Object.keys(propuesto).filter((k) => norm(propuesto[k]) !== norm(actual[k]));
}

/** Índices de `core.ids_externos` (sistema opai1) para una entidad. */
export function indiceIds(destino: EstadoDestino, entidad: EntidadImportada) {
  const porExterno = new Map<string, string>();
  const porDestino = new Map<string, string[]>();
  for (const i of destino.ids) {
    if (i.entidadTipo !== entidad) continue;
    porExterno.set(i.idExterno, i.entidadId);
    porDestino.set(i.entidadId, [...(porDestino.get(i.entidadId) ?? []), i.idExterno]);
  }
  /** Mapeado a otra fila de 1.0 distinta de las aceptadas. */
  const mapeadoAOtro = (destinoId: string, aceptados: readonly string[]) =>
    (porDestino.get(destinoId) ?? []).some((e) => !aceptados.includes(e));
  return { porExterno, porDestino, mapeadoAOtro };
}

/**
 * Decisión para una fila duplicada de otra canónica: si ya está mapeada a la misma fila 2.0 queda
 * sin cambios; si está mapeada a otra, conflicto; si no, se omite y la carga real la mapea.
 */
export function decisionDuplicado<D>(
  entidad: EntidadImportada,
  idOpai1: string,
  canonica: Decision<D>,
  mapeado: string | undefined,
  motivo: string,
): Decision<D> {
  const base = { fusionaCon: canonica.idOpai1, motivo };
  if (mapeado === undefined) return decision<D>(entidad, idOpai1, "omitido", base);
  if (mapeado === canonica.destinoId)
    return decision<D>(entidad, idOpai1, "sin_cambios", { ...base, destinoId: mapeado });
  return decision<D>(entidad, idOpai1, "conflicto", {
    ...base,
    motivo: `${motivo}_mapeado_a_otra_fila`,
    destinoId: mapeado,
  });
}

/**
 * Decisión para una fila ya mapeada: sin cambios o actualizar. Solo completa campos vacíos de 2.0
 * (`completarVacios`); los valores distintos quedan como conflictos de campo, sin escribir.
 */
export function decisionMapeada<D extends Record<string, unknown>>(
  entidad: EntidadImportada,
  idOpai1: string,
  datos: D,
  actual: Record<string, unknown> | undefined,
  destinoId: string,
  equivalentes: Readonly<Record<string, unknown>> = {},
): Decision<D> {
  if (!actual)
    return decision<D>(entidad, idOpai1, "conflicto", { motivo: "id_externo_huerfano", destinoId });
  const { escribir, conflictos } = completarVacios(datos, actual, equivalentes);
  const campos = Object.keys(escribir);
  return campos.length === 0
    ? decision<D>(entidad, idOpai1, "sin_cambios", { destinoId, datos, conflictos })
    : decision<D>(entidad, idOpai1, "actualizar", {
        destinoId,
        campos,
        conflictos,
        datos,
        motivo: "completa_vacios",
      });
}
