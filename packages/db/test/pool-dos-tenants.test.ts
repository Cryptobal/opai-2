import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno } from "./entorno";

// No bloqueante del Revisor (#100): dos tenants a la vez sobre el mismo pool, con pocas conexiones
// para forzar su reutilización y transacciones que fallan (ROLLBACK) entre medio.
describe("pool compartido: dos tenants en paralelo no se ven entre sí", () => {
  let entorno: Entorno;
  const tenants: { id: string; cargos: string[] }[] = [];

  beforeAll(async () => {
    process.env["DATABASE_POOL_MAX"] = "3";
    entorno = await prepararEntorno();
    for (const nombre of ["A", "B"]) {
      const t = await entorno.admin.tenant.create({
        data: { slug: `dos-${randomUUID().slice(0, 8)}`, nombre, vertical: "aseo" },
      });
      const cargos = await Promise.all(
        [1, 2, 3].map((n) =>
          entorno.admin.cargo.create({ data: { tenantId: t.id, nombre: `${nombre}-${n}` } }),
        ),
      );
      tenants.push({ id: t.id, cargos: cargos.map((c) => c.id).sort() });
    }
  });
  afterAll(async () => {
    for (const t of tenants) {
      await entorno.admin.cargo.deleteMany({ where: { tenantId: t.id } });
      await entorno.admin.tenant.delete({ where: { id: t.id } });
    }
    await entorno?.cerrar();
    delete process.env["DATABASE_POOL_MAX"];
  });

  it("200 lecturas alternadas, con fallos intercalados, devuelven solo filas del propio tenant", async () => {
    const operaciones = Array.from({ length: 200 }, async (_, i) => {
      const t = tenants[i % 2];
      if (!t) throw new Error("falta tenant");
      const db = entorno.forTenant(t.id);
      if (i % 7 === 0) {
        // Falla dentro de la transacción (uuid inválido): ROLLBACK y la conexión vuelve al pool.
        await expect(db.cargo.findUnique({ where: { id: "no-es-uuid" } })).rejects.toThrow();
        return;
      }
      const [cargos, total] = await Promise.all([
        db.cargo.findMany({ select: { id: true, tenantId: true } }),
        db.cargo.count(),
      ]);
      expect(cargos.map((c) => c.id).sort()).toEqual(t.cargos);
      expect(cargos.every((c) => c.tenantId === t.id)).toBe(true);
      expect(total).toBe(t.cargos.length);
    });
    await Promise.all(operaciones);
  });
});
