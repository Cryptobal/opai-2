import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("Personas ficha PR 2 · RLS", () => {
  let e: Entorno;
  let idA = "";
  let idB = "";
  let personaA = "";
  const sufijo = randomUUID().slice(0, 8);

  beforeAll(async () => {
    e = await prepararEntorno();
    idA = (await e.admin.tenant.create({ data: { slug: `pr2-a-${sufijo}`, nombre: "A", vertical: "seguridad" } }))
      .id;
    idB = (await e.admin.tenant.create({ data: { slug: `pr2-b-${sufijo}`, nombre: "B", vertical: "seguridad" } }))
      .id;
    personaA = (
      await e.forTenant(idA).persona.create({
        data: { tenantId: idA, nombres: "T", apellidos: "Uno", rut: "12345678-5" },
      })
    ).id;
    await e.forTenant(idA).personaPrevision.create({
      data: { tenantId: idA, personaId: personaA, afp: "Modelo" },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("tenant B no ve previsión del tenant A", async () => {
    expect(await e.forTenant(idB).personaPrevision.count({ where: { personaId: personaA } })).toBe(0);
  });

  it("tablas PR2 tienen RLS forzada", async () => {
    const tablas = [
      "personas_prevision",
      "personas_pago",
      "personas_pago_solicitudes",
      "personas_uniforme",
      "personas_jornada_dt",
      "personas_os10",
      "personas_contacto_laboral",
    ];
    const filas = await e.admin.$queryRaw<{ tabla: string; forzada: boolean }[]>`
      SELECT c.relname AS tabla, c.relforcerowsecurity AS forzada
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'core' AND c.relname = ANY(${tablas}::text[])`;
    expect(filas.every((f) => f.forzada)).toBe(true);
  });
});
