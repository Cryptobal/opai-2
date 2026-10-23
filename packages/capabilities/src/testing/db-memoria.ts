// Base en memoria para tests de capacidades: imita el subconjunto de Prisma que usan los
// handlers del núcleo (where por igualdad, `in`, `not`, claves compuestas, include de relaciones).
import { randomUUID } from "node:crypto";

import type { Globales, TenantDb } from "@opai/db";

type Fila = Record<string, unknown>;
type Where = Record<string, unknown>;

const RELACIONES: Record<string, Record<string, [tabla: string, clave: string]>> = {
  membership: { user: ["user", "userId"], tenant: ["tenant", "tenantId"] },
  apiKey: { user: ["user", "userId"] },
};

function cumple(fila: Fila, where: Where = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR" && Array.isArray(v)) return v.some((w: Where) => cumple(fila, w));
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const op = v as { in?: unknown[]; not?: unknown };
      if ("in" in op) return (op.in ?? []).includes(fila[k]);
      if ("not" in op) return fila[k] !== op.not;
      return cumple(fila, op as Where); // clave compuesta: tenantId_userId: { … }
    }
    return fila[k] === v;
  });
}

export function dbEnMemoria(semilla: Record<string, Fila[]> = {}) {
  const tablas = new Map<string, Fila[]>(Object.entries(semilla).map(([k, v]) => [k, [...v]]));
  const tabla = (n: string) => tablas.get(n) ?? (tablas.set(n, []), tablas.get(n) as Fila[]);

  function incluir(modelo: string, fila: Fila, include?: Record<string, boolean>): Fila {
    if (!include) return { ...fila };
    const extra: Fila = {};
    for (const rel of Object.keys(include)) {
      const [t, clave] = RELACIONES[modelo]?.[rel] ?? [rel, `${rel}Id`];
      extra[rel] = tabla(t).find((f) => f["id"] === fila[clave]);
    }
    return { ...fila, ...extra };
  }

  function delegado(modelo: string) {
    const filas = () => tabla(modelo);
    type Args = { where?: Where; data?: Fila; include?: Record<string, boolean>; take?: number };
    const crear = (data: Fila) => {
      const fila = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      filas().push(fila);
      return fila;
    };
    return {
      findUnique: async (a: Args) => {
        const f = filas().find((x) => cumple(x, a.where));
        return f ? incluir(modelo, f, a.include) : null;
      },
      findMany: async (a: Args = {}) =>
        filas()
          .filter((x) => cumple(x, a.where))
          .slice(0, a.take)
          .map((f) => incluir(modelo, f, a.include)),
      count: async (a: Args = {}) => filas().filter((x) => cumple(x, a.where)).length,
      create: async (a: Args) => crear(a.data ?? {}),
      update: async (a: Args) => {
        const f = filas().find((x) => cumple(x, a.where));
        if (!f) throw new Error(`${modelo} no encontrado`);
        return Object.assign(f, a.data, { updatedAt: new Date() });
      },
      updateMany: async (a: Args) => {
        const lista = filas().filter((x) => cumple(x, a.where));
        lista.forEach((f) => Object.assign(f, a.data));
        return { count: lista.length };
      },
      upsert: async (a: Args & { create: Fila; update: Fila }) => {
        const f = filas().find((x) => cumple(x, a.where));
        return f ? Object.assign(f, a.update) : crear(a.create);
      },
      delete: async (a: Args) => {
        const i = filas().findIndex((x) => cumple(x, a.where));
        return filas().splice(i, 1)[0];
      },
    };
  }

  const modelos = [
    "tenant",
    "user",
    "membership",
    "invitation",
    "apiKey",
    "tenantModule",
    "auditEvent",
    "usageEvent",
  ];
  const db: Record<string, unknown> = Object.fromEntries(modelos.map((m) => [m, delegado(m)]));
  const globales: Record<string, unknown> = { tenant: db["tenant"], user: db["user"] };
  return { db: db as TenantDb, globales: globales as Globales, tabla };
}
