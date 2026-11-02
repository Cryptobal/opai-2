import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "../src/catalogo-comercial";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("CPQ propuesta técnica RLS (CAR-144)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let usuario = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    idA = (await e.admin.tenant.create({ data: { slug: `pt-a-${sufijo}`, nombre: "A", vertical: "seguridad" } })).id;
    idB = (await e.admin.tenant.create({ data: { slug: `pt-b-${sufijo}`, nombre: "B", vertical: "seguridad" } })).id;
    await sembrarComercial(e.admin.$extends({}), idA);
    usuario = (await e.admin.user.create({ data: { email: `pt-${sufijo}@prueba.cl`, name: "QA", emailVerified: true } })).id;
    await e.admin.cpqBibliotecaBloque.create({
      data: {
        tenantId: idA,
        clave: `bloque-${sufijo}`,
        tipo: "texto_libre",
        titulo: "Demo",
        contenidoJson: "{}",
        creadoPorId: usuario,
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("biblioteca y propuestas aisladas por tenant", async () => {
    expect(await e.forTenant(idA).cpqBibliotecaBloque.count()).toBe(1);
    expect(await e.forTenant(idB).cpqBibliotecaBloque.count()).toBe(0);
    await expect(
      e.forTenant(idB).cpqBibliotecaBloque.create({
        data: {
          tenantId: idA,
          clave: "x",
          tipo: "texto_libre",
          titulo: "X",
          contenidoJson: "{}",
          creadoPorId: usuario,
        },
      }),
    ).rejects.toThrow();
  });
});
