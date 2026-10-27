import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion, leerInbox, registrarObservadorConsultas } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

describe.skipIf(!urlPropietario)("inbox propio: página y conteo en una sentencia", () => {
  let e: Entorno, tenantId: string, otroTenant: string, usuarioId: string, otroUsuario: string;
  beforeAll(async () => {
    e = await prepararEntorno();
    const tenant = async () =>
      (
        await e.admin.tenant.create({
          data: {
            slug: `inbox-${randomUUID()}`,
            nombre: "Ficticio",
            vertical: "seguridad",
          },
        })
      ).id;
    const user = async () =>
      (
        await e.admin.user.create({
          data: {
            name: "Ficticio",
            email: `inbox-${randomUUID()}@example.test`,
          },
        })
      ).id;
    [tenantId, otroTenant] = await Promise.all([tenant(), tenant()]);
    [usuarioId, otroUsuario] = await Promise.all([user(), user()]);
    await e.admin.notificacion.createMany({
      data: [
        ...[1, 2, 3].map((n) => ({
          tenantId,
          usuarioId,
          titulo: `Propia ${n}`,
          createdAt: new Date(`2026-01-0${n}T00:00:00Z`),
          leidaEn: n === 1 ? new Date("2026-01-02T00:00:00Z") : null,
        })),
        { tenantId, usuarioId: otroUsuario, titulo: "Ajena usuario" },
        { tenantId: otroTenant, usuarioId, titulo: "Ajena tenant" },
      ],
    });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("limita la página sin limitar el conteo, ordena y no mezcla usuario/tenant", async () => {
    let consultas = 0;
    registrarObservadorConsultas(() => {
      consultas++;
    });
    try {
      const r = await enTransaccion(tenantId, (tx) => leerInbox(tx, tenantId, usuarioId, false, 1));
      expect(consultas).toBe(1);
      expect(r.noLeidas).toBe(2);
      expect(r.items).toHaveLength(1);
      expect(r.items[0]).toMatchObject({
        titulo: "Propia 3",
        creadaEn: "2026-01-03T00:00:00.000Z",
      });
    } finally {
      registrarObservadorConsultas(null);
    }
    const primera = await enTransaccion(tenantId, (tx) => leerInbox(tx, tenantId, usuarioId, false, 1));
    const siguiente = await enTransaccion(tenantId, (tx) =>
      leerInbox(tx, tenantId, usuarioId, false, 10, primera.items[0]!.id),
    );
    expect(siguiente.items.map((n) => n.titulo)).toEqual(["Propia 2", "Propia 1"]);
    expect(siguiente.noLeidas).toBe(2);
    const pendientes = await enTransaccion(tenantId, (tx) =>
      leerInbox(tx, tenantId, usuarioId, true, 10),
    );
    expect(pendientes.items.map((n) => n.titulo)).toEqual(["Propia 3", "Propia 2"]);
    const ajena = await enTransaccion(tenantId, (tx) =>
      leerInbox(tx, otroTenant, usuarioId, false, 10),
    );
    expect(ajena).toEqual({ items: [], noLeidas: 0, cursorValido: true });
    const vacia = await enTransaccion(tenantId, (tx) =>
      leerInbox(tx, tenantId, randomUUID(), false, 10),
    );
    expect(vacia).toEqual({ items: [], noLeidas: 0, cursorValido: true });
  });
});
