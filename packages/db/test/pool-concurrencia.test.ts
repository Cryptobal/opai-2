import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno } from "./entorno";

// Cada archivo corre en su propio proceso: `util.deprecate` de pg avisa una sola vez por proceso,
// así que este archivo no debe compartir proceso con consultas concurrentes previas.
describe("pool de la app contra Postgres real", () => {
  let entorno: Entorno;
  const avisos: string[] = [];
  const escuchar = (w: Error) => avisos.push(`${w.name}: ${w.message}`);

  beforeAll(async () => {
    process.on("warning", escuchar);
    entorno = await prepararEntorno();
  });
  afterAll(async () => {
    process.off("warning", escuchar);
    await entorno?.cerrar();
  });

  it("un include de varias relaciones dentro de forTenant no solapa consultas en la conexión", async () => {
    // Prisma resuelve cada relación incluida con su propia consulta y las lanza a la vez sobre la
    // conexión de la transacción (forTenant siempre abre una): sin ClienteSerial, 4 en vuelo y la
    // DeprecationWarning «already executing a query» de pg.
    const tenant = await entorno.admin.tenant.create({
      data: { slug: `pool-${randomUUID().slice(0, 8)}`, nombre: "Pool", vertical: "aseo" },
    });
    const filas = await entorno.forTenant(tenant.id).tenant.findMany({
      where: { id: tenant.id },
      include: { roles: true, modules: true, cargos: true, personas: true },
    });
    expect(filas.map((f) => f.id)).toEqual([tenant.id]);
    await new Promise((r) => setImmediate(r));
    expect(avisos.filter((a) => a.includes("already executing a query"))).toEqual([]);
    await entorno.admin.tenant.delete({ where: { id: tenant.id } });
  });

  it("muchas lecturas en paralelo con forTenant comparten un solo pool sin agotarlo", async () => {
    const db = entorno.forTenant(randomUUID());
    const res = await Promise.all(Array.from({ length: 25 }, () => db.persona.count()));
    expect(res.every((n) => n === 0)).toBe(true);
  });
});
