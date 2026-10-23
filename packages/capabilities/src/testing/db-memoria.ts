// Base en memoria para tests de capacidades: imita el subconjunto de Prisma que usan los handlers
// del núcleo (where por igualdad, `in`, `not`, comparaciones, `contains`, `OR`, claves compuestas,
// include de relaciones, orderBy, take, groupBy con _count y _sum, createMany con skipDuplicates).
import { randomUUID } from "node:crypto";

import type { Globales, TenantDb, TenantTx } from "@opai/db";

import { agrupar, cumple, ordenar, type Fila, type Where } from "./db-memoria-util";

const RELACIONES: Record<string, Record<string, [tabla: string, clave: string]>> = {
  membership: { user: ["user", "userId"], tenant: ["tenant", "tenantId"] },
  apiKey: { user: ["user", "userId"] },
};

export function dbEnMemoria(semilla: Record<string, Fila[]> = {}) {
  const tablas = new Map<string, Fila[]>(Object.entries(semilla).map(([k, v]) => [k, [...v]]));
  const tabla = (n: string) => tablas.get(n) ?? (tablas.set(n, []), tablas.get(n) as Fila[]);
  const unicos: Record<string, string[]> = { trabajo: ["claveUnica"] };

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
    type Args = {
      where?: Where;
      data?: Fila;
      include?: Record<string, boolean>;
      take?: number;
      orderBy?: unknown;
    };
    const crear = (data: Fila) => {
      const fila = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      filas().push(fila);
      return fila;
    };
    const duplicado = (data: Fila) =>
      (unicos[modelo] ?? []).some(
        (c) =>
          data[c] != null &&
          filas().some((f) => f[c] === data[c] && f["tenantId"] === data["tenantId"]),
      );
    const buscar = (a: Args = {}) =>
      ordenar(
        filas().filter((x) => cumple(x, a.where)),
        a.orderBy,
      ).slice(0, a.take);
    return {
      findUnique: async (a: Args) => {
        const f = filas().find((x) => cumple(x, a.where));
        return f ? incluir(modelo, f, a.include) : null;
      },
      findFirst: async (a: Args = {}) => {
        const f = buscar(a)[0];
        return f ? incluir(modelo, f, a.include) : null;
      },
      findMany: async (a: Args = {}) => buscar(a).map((f) => incluir(modelo, f, a.include)),
      count: async (a: Args = {}) => filas().filter((x) => cumple(x, a.where)).length,
      create: async (a: Args) => crear(a.data ?? {}),
      createMany: async (a: { data: Fila[]; skipDuplicates?: boolean }) => {
        let count = 0;
        for (const d of a.data) {
          if (duplicado(d)) {
            if (a.skipDuplicates) continue;
            throw new Error(`${modelo}: valor único duplicado`);
          }
          crear(d);
          count += 1;
        }
        return { count };
      },
      update: async (a: Args) => {
        const f = filas().find((x) => cumple(x, a.where));
        if (!f) throw new Error(`${modelo} no encontrado`);
        return Object.assign(f, a.data, { updatedAt: new Date() });
      },
      updateMany: async (a: Args) => {
        const lista = filas().filter((x) => cumple(x, a.where));
        lista.forEach((f) => Object.assign(f, a.data, { updatedAt: new Date() }));
        return { count: lista.length };
      },
      upsert: async (a: Args & { create: Fila; update: Fila }) => {
        const f = filas().find((x) => cumple(x, a.where));
        return f ? Object.assign(f, a.update, { updatedAt: new Date() }) : crear(a.create);
      },
      delete: async (a: Args) => {
        const i = filas().findIndex((x) => cumple(x, a.where));
        return filas().splice(i, 1)[0];
      },
      deleteMany: async (a: Args = {}) => {
        const quedan = filas().filter((x) => !cumple(x, a.where));
        const count = filas().length - quedan.length;
        tablas.set(modelo, quedan);
        return { count };
      },
      groupBy: async (a: Parameters<typeof agrupar>[1]) => agrupar(filas(), a),
    };
  }

  const db: Record<string, unknown> = new Proxy(
    {},
    { get: (cache: Record<string, unknown>, m: string) => (cache[m] ??= delegado(m)) },
  );
  const globales: Record<string, unknown> = {
    tenant: db["tenant"],
    user: db["user"],
    ajustePlataforma: db["ajustePlataforma"],
    precioRecurso: db["precioRecurso"],
  };
  return { db: db as TenantDb, tx: db as TenantTx, globales: globales as Globales, tabla };
}
