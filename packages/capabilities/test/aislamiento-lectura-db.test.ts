// Aislamiento de las lecturas en una sola transacción (ADR-045) contra Postgres real: las capacidades
// de lectura corren por `executeCapability` → `crearContexto` → `ctx.enLectura`, que fija `app.tenant_id`
// una vez por transacción con `set_config(..., true)` (alcance local). Se comprueba que la RLS sigue
// aislando por tenant y que el `set_config` no se filtra al pool tras el commit ni tras el rollback.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { clienteApp } from "../../db/src/client";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("aislamiento de lecturas por enLectura (ADR-045)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let personaA = "";
  let personaB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevo(`aisl-a-${sufijo}`)).id;
    idB = (await nuevo(`aisl-b-${sufijo}`)).id;
    personaA = (
      await e.admin.persona.create({
        data: { tenantId: idA, nombres: "Ana", apellidos: "Acuña", rut: "11111111-1" },
      })
    ).id;
    personaB = (
      await e.admin.persona.create({
        data: { tenantId: idB, nombres: "Bruno", apellidos: "Bravo", rut: "22222222-2" },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  it("la lista desde A no trae ninguna fila de B", async () => {
    const r = await mod.executeCapability(ctx(idA), "core.personas.list", {});
    if (!r.ok) throw new Error(`list: ${JSON.stringify(r.error)}`);
    const data = r.data as { items: { id: string }[] };
    expect(data.items.map((p) => p.id)).toEqual([personaA]);
    expect(data.items.some((p) => p.id === personaB)).toBe(false);
  });

  it("pedir desde A una persona de B por id da NOT_FOUND", async () => {
    const r = await mod.executeCapability(ctx(idA), "core.personas.get", { id: personaB });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("tras el commit de una lectura y tras un rollback, el pool sin set_config no ve filas", async () => {
    const comprobarPoolSinTenant = async () => {
      const app = clienteApp();
      await Promise.all(
        Array.from({ length: 10 }, async () => {
          const [cantidad, tenant] = await Promise.all([
            app.persona.count(),
            app.$queryRaw<{ tenant: string }[]>`
              SELECT coalesce(current_setting('app.tenant_id', true), '') AS tenant
            `,
          ]);
          expect(cantidad).toBe(0);
          expect(tenant).toEqual([{ tenant: "" }]);
        }),
      );
    };
    // Commit: una lectura real por el camino de ADR-045 (una sola transacción con el tenant fijado).
    const r = await mod.executeCapability(ctx(idA), "core.personas.list", {});
    expect(r.ok).toBe(true);
    // Fuera de transacción, el mismo pool de la app queda sin tenant y la RLS niega por defecto.
    await comprobarPoolSinTenant();

    // Rollback: `enLectura` revierte si el handler lanza y tampoco deja el tenant fijado en el pool.
    const c = ctx(idA);
    expect(c.enLectura).toBeDefined();
    await expect(
      c.enLectura?.(async (db) => {
        // Dentro de la transacción el tenant está fijado y la persona de A sí es visible.
        expect(await db.persona.count()).toBe(1);
        throw new Error("revienta la lectura a propósito");
      }),
    ).rejects.toThrow("revienta la lectura a propósito");
    await comprobarPoolSinTenant();
  });
});
