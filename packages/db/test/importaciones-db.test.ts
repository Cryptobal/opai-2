import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion } from "../src/index";
import { type Entorno, prepararEntorno } from "./entorno";

describe("RLS core.importaciones (Brief B3)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    idA = (await e.admin.tenant.create({ data: { slug: `imp-a-${sufijo}`, nombre: "A", vertical: "seguridad" } })).id;
    idB = (await e.admin.tenant.create({ data: { slug: `imp-b-${sufijo}`, nombre: "B", vertical: "seguridad" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada tenant ve solo sus importaciones", async () => {
    const impA = await enTransaccion(idA, (tx) =>
      tx.importacion.create({
        data: {
          tenantId: idA,
          sistema: "opai1",
          origen: "fixtures",
          versionContrato: "opai1-export/v1",
          modo: "simular",
          estado: "completada",
          conteos: {},
        },
        select: { id: true },
      }),
    );
    await enTransaccion(idB, (tx) =>
      tx.importacion.create({
        data: {
          tenantId: idB,
          sistema: "opai1",
          origen: "fixtures",
          versionContrato: "opai1-export/v1",
          modo: "simular",
          estado: "completada",
          conteos: {},
        },
      }),
    );
    const listaA = await e.forTenant(idA).importacion.findMany();
    expect(listaA.every((i) => i.tenantId === idA)).toBe(true);
    expect(listaA.some((i) => i.id === impA.id)).toBe(true);
  });
});
