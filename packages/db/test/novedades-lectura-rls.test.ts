import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { forTenant } from "../src/for-tenant";
import { forTenantUsuario } from "../src/for-tenant-usuario";
import { omitirSuiteDb, prepararEntorno } from "./entorno";

describe.skipIf(omitirSuiteDb())("RLS core.novedades_lectura", () => {
  let e: Awaited<ReturnType<typeof prepararEntorno>>;
  const sufijo = randomUUID().slice(0, 8);
  let tenantId = "";
  let usuarioA = "";
  let usuarioB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const slug = `nov-lect-${sufijo}`;
    const tenant = await e.admin.tenant.create({
      data: { slug, nombre: slug, vertical: "seguridad" },
    });
    tenantId = tenant.id;
    const uA = await e.admin.user.create({
      data: { name: "A", email: `a-${sufijo}@test.opai.cl` },
    });
    const uB = await e.admin.user.create({
      data: { name: "B", email: `b-${sufijo}@test.opai.cl` },
    });
    usuarioA = uA.id;
    usuarioB = uB.id;
    await e.admin.membership.createMany({
      data: [
        { tenantId, userId: usuarioA, rol: "owner", portales: ["erp"] },
        { tenantId, userId: usuarioB, rol: "owner", portales: ["erp"] },
      ],
    });
    await e.admin.novedadLectura.create({
      data: {
        tenantId,
        usuarioId: usuarioA,
        novedadId: "prueba-a",
        leidaEn: new Date(),
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("usuario A ve su fila con forTenantUsuario", async () => {
    const n = await forTenantUsuario(tenantId, usuarioA).novedadLectura.count();
    expect(n).toBe(1);
  });

  it("usuario B no ve la fila de A", async () => {
    const n = await forTenantUsuario(tenantId, usuarioB).novedadLectura.count();
    expect(n).toBe(0);
  });

  it("forTenant sin app.user_id no lee filas (política restrictiva)", async () => {
    const n = await forTenant(tenantId).novedadLectura.count();
    expect(n).toBe(0);
  });
});
