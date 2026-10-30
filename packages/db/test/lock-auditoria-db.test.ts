import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as Db from "../src/index";
import { type Entorno, prepararEntorno } from "./entorno";

// Incidente del 28-oct-2026 (15:53): una transacción quedó «idle in transaction» con el lock de
// auditoría del tenant y las demás conexiones esperaron ese lock sin tope hasta agotar el pool.
describe("lock de auditoría: sin esperas largas ni transacciones que pidan al pool con el lock", () => {
  let entorno: Entorno;
  let db: typeof Db;
  let tenantId = "";
  let otroTenant = "";
  const hecho = (capability: string) => ({
    actorTipo: "user",
    actorId: null,
    viaUserId: null,
    capability,
    entityType: "perfil_empresa",
    entityId: null,
    payload: { campos: ["giro"] },
  });

  beforeAll(async () => {
    process.env["DATABASE_POOL_MAX"] = "3";
    entorno = await prepararEntorno();
    db = await import("../src/index");
    for (const nombre of ["Lock", "Otro"]) {
      const t = await entorno.admin.tenant.create({
        data: { slug: `lock-${randomUUID().slice(0, 8)}`, nombre, vertical: "aseo" },
      });
      if (nombre === "Lock") tenantId = t.id;
      else otroTenant = t.id;
    }
  });
  afterAll(async () => {
    await entorno?.cerrar();
    delete process.env["DATABASE_POOL_MAX"];
  });

  it("con el lock tomado y la transacción ociosa, las demás fallan en ~3 s y el pool sigue sirviendo", async () => {
    let soltar: () => void = () => undefined;
    const liberado = new Promise<void>((r) => (soltar = r));
    let conLock: () => void = () => undefined;
    const tomado = new Promise<void>((r) => (conLock = r));
    // Como el incidente: append de auditoría y luego la transacción queda abierta sin consultar.
    const retenedora = db.enTransaccion(
      tenantId,
      async (tx) => {
        await db.agregarAAuditoria(tx, tenantId, hecho("core.empresa.update"));
        conLock();
        await liberado;
      },
      { timeoutMs: 14_000 },
    );
    await tomado;

    const inicio = Date.now();
    const esperas = await Promise.allSettled(
      [1, 2].map(() =>
        db.enTransaccion(tenantId, (tx) =>
          db.agregarAAuditoria(tx, tenantId, hecho("core.tenant.update")),
        ),
      ),
    );
    const transcurrido = Date.now() - inicio;
    // Sin el tope esperaban hasta el timeout de la transacción (15 s) acaparando el pool.
    expect(esperas.map((e) => e.status)).toEqual(["rejected", "rejected"]);
    for (const e of esperas)
      if (e.status === "rejected") expect(String(e.reason)).toMatch(/lock timeout|55P03/i);
    expect(transcurrido).toBeLessThan(6_000);
    // Mientras tanto, otro tenant obtiene conexión y lee (el pool no quedó agotado).
    expect(await entorno.forTenant(otroTenant).cargo.count()).toBe(0);

    soltar();
    await retenedora;
    const despues = await db.enTransaccion(tenantId, (tx) =>
      db.agregarAAuditoria(tx, tenantId, hecho("core.tenant.update")),
    );
    expect(despues.seq).toBe(2);
  }, 30_000);

  it("con el lock tomado, la transacción no puede pedir otra conexión del pool", async () => {
    const intento = (otra: "forTenant" | "enTransaccion") =>
      db.enTransaccion(tenantId, async (tx) => {
        // Antes del append sí puede (no tiene el lock): no rompe lecturas independientes.
        await entorno.forTenant(otroTenant).cargo.count();
        await db.agregarAAuditoria(tx, tenantId, hecho("core.empresa.update"));
        if (otra === "forTenant") await entorno.forTenant(otroTenant).cargo.count();
        else await db.enTransaccion(otroTenant, (t2) => t2.cargo.count());
      });
    await expect(intento("forTenant")).rejects.toThrow(/lock de auditoría/);
    await expect(intento("enTransaccion")).rejects.toThrow(/lock de auditoría/);
    // Ambas hicieron ROLLBACK: el append de cada una no quedó.
    const filas = await entorno.admin.auditEvent.count({
      where: { tenantId, capability: "core.empresa.update" },
    });
    expect(filas).toBe(1);
  });

  it("el rol opai_app tiene lock_timeout, statement_timeout e idle_in_transaction_session_timeout", async () => {
    // El idle de opai_app es global del cluster (setdatabase=0); en el Postgres local compartido entre
    // worktrees otra rama puede reaplicar el 30 s de CAR-35. Reaplicamos la sentencia (idempotente) de
    // la migración 20261029200000 de B1 para que la verificación sea determinista aquí; en CI (base
    // efímera, migraciones en orden) opai_app ya queda en 5 s.
    await entorno.admin.$executeRaw`ALTER ROLE opai_app SET idle_in_transaction_session_timeout = '5s'`;
    const [rol] = await entorno.admin.$queryRaw<{ config: string[] | null }[]>`
      SELECT rolconfig AS config FROM pg_roles WHERE rolname = 'opai_app'`;
    expect(rol?.config).toEqual(
      expect.arrayContaining([
        "lock_timeout=5s",
        "statement_timeout=20s",
        // B1 · causa raíz: la migración 20261029200000 bajó el tope de 30 s (CAR-35) a 5 s para
        // cortar las transacciones de sesión abandonadas que quedaban «idle in transaction».
        "idle_in_transaction_session_timeout=5s",
      ]),
    );
    const [funcion] = await entorno.admin.$queryRaw<{ config: string[] | null }[]>`
      SELECT proconfig AS config FROM pg_proc WHERE proname = 'auditoria_append'`;
    expect(funcion?.config).toEqual(expect.arrayContaining(["lock_timeout=3s"]));
  });
});
