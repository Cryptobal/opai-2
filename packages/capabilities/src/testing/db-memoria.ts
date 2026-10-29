// Base en memoria para tests de capacidades: imita el subconjunto de Prisma que usan los handlers
// del núcleo (where por igualdad, `in`, `not`, comparaciones, `contains`, `OR`, claves compuestas,
// include de relaciones, orderBy, take, groupBy con _count y _sum, createMany con skipDuplicates).

import type { Globales, TenantDb, TenantTx } from "@opai/db";

import { uuid7 } from "../core/documentos/uuid7";
import { agrupar, cumple, ordenar, type Fila, type Where } from "./db-memoria-util";
import { type Include, incluir, resolverWhereRelaciones } from "./db-memoria-rel";
import { lecturasLocksMemoria } from "./lecturas-locks-memoria";
import { globalesEnMemoria } from "./plataforma-memoria";

// Ids crecientes como uuid(7): el orden por id es el orden de creación, igual que en Postgres. Se
// usa el MISMO generador que inyectan las capacidades (p. ej. `incidente_registrar` pasa `uuid7()`),
// con un contador de milisegundos monótono siempre por delante del reloj, para que un id autogenerado
// quede estrictamente después de cualquier id inyectado antes: así ordenar por id es el orden real de
// creación tanto aquí como en Postgres.
let ultimoMs = 0;
const idOrdenado = () => {
  ultimoMs = Math.max(ultimoMs + 1, Date.now() + 1);
  return uuid7(ultimoMs);
};

export function dbEnMemoria(semilla: Record<string, Fila[]> = {}) {
  const tablas = new Map<string, Fila[]>(Object.entries(semilla).map(([k, v]) => [k, [...v]]));
  const tabla = (n: string) => tablas.get(n) ?? (tablas.set(n, []), tablas.get(n) as Fila[]);
  const unicos: Record<string, string[]> = { trabajo: ["claveUnica"] };

  function delegado(modelo: string) {
    const filas = () => tabla(modelo);
    type Args = {
      where?: Where;
      data?: Fila;
      include?: Include;
      select?: Include;
      take?: number;
      skip?: number;
      cursor?: { id: string };
      orderBy?: unknown;
    };
    const filtrar = (where?: Where) => {
      const w = resolverWhereRelaciones(tabla, modelo, where);
      return filas().filter((x) => cumple(x, w));
    };
    const crear = (data: Fila) => {
      const fila = { id: idOrdenado(), createdAt: new Date(), updatedAt: new Date(), ...data };
      filas().push(fila);
      return fila;
    };
    const duplicado = (data: Fila) =>
      (unicos[modelo] ?? []).some(
        (c) =>
          data[c] != null &&
          filas().some((f) => f[c] === data[c] && f["tenantId"] === data["tenantId"]),
      );
    const buscar = (a: Args = {}) => {
      const orden = ordenar(filtrar(a.where), a.orderBy);
      const desde = a.cursor
        ? Math.max(
            orden.findIndex((f) => f["id"] === a.cursor?.id),
            0,
          )
        : 0;
      const inicio = desde + (a.skip ?? 0);
      return orden.slice(inicio, a.take === undefined ? undefined : inicio + a.take);
    };
    return {
      findUnique: async (a: Args) => {
        const f = filas().find((x) => cumple(x, a.where));
        return f ? incluir(tabla, modelo, f, a) : null;
      },
      findFirst: async (a: Args = {}) => {
        const f = buscar(a)[0];
        return f ? incluir(tabla, modelo, f, a) : null;
      },
      findMany: async (a: Args = {}) => buscar(a).map((f) => incluir(tabla, modelo, f, a)),
      count: async (a: Args = {}) => filtrar(a.where).length,
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
    { $queryRaw: lecturasLocksMemoria(tabla) },
    { get: (cache: Record<string, unknown>, m: string) => (cache[m] ??= delegado(m)) },
  );
  const globales = globalesEnMemoria(delegado);
  /** Copia de todas las tablas; la función devuelta las restaura (rollback de `transaccion`). */
  function instantanea(): () => void {
    const copia = new Map([...tablas].map(([k, v]) => [k, v.map((f) => ({ ...f }))]));
    return () => {
      tablas.clear();
      for (const [k, v] of copia) tablas.set(k, v);
    };
  }
  return {
    db: db as TenantDb,
    tx: db as TenantTx,
    globales: globales as Globales,
    tabla,
    instantanea,
  };
}
