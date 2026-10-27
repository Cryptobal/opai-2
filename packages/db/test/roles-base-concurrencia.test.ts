import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { actualizarPlantilla } from "../scripts/roles-base-actualizar";
import { PLANTILLAS } from "../scripts/roles-base-plantillas";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("seed: preserva ediciones concurrentes del tenant", () => {
  let e: Entorno;
  let tenantId: string;
  const p = PLANTILLAS.find((p) => p.nombre === "Inspector DT")!;
  beforeAll(async () => {
    e = await prepararEntorno();
    tenantId = (
      await e.admin.tenant.create({
        data: {
          slug: `seed-cas-${randomUUID()}`,
          nombre: "Seed test",
          vertical: "seguridad",
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it.each(["nombre", "descripcion", "permisos"] as const)(
    "no pisa la edición de %s",
    async (campo) => {
      const original = await e.forTenant(tenantId).rol.create({
        data: {
          tenantId,
          nombre: p.nombre,
          descripcion: "Previa",
          sistema: false,
          permisos: p.permisos.filter((x) => x !== "core:estructuras.read_sensible"),
        },
      });
      try {
        await e
          .forTenant(tenantId)
          .rol.update({
            where: { id: original.id },
            data:
              campo === "permisos"
                ? { permisos: ["core:tenant.read"] }
                : { [campo]: "Edición del tenant" },
          });
        expect(await actualizarPlantilla(e.forTenant(tenantId), original, p)).toMatchObject({
          count: 0,
        });
        const actual = await e
          .forTenant(tenantId)
          .rol.findUniqueOrThrow({ where: { id: original.id } });
        expect(actual.permisos).not.toContain("core:estructuras.read_sensible");
        if (campo !== "permisos") expect(actual[campo]).toBe("Edición del tenant");
      } finally {
        await e.forTenant(tenantId).rol.delete({ where: { id: original.id } });
      }
    },
  );

  it("actualiza un baseline intacto una sola vez", async () => {
    const original = await e.forTenant(tenantId).rol.create({
      data: {
        tenantId,
        nombre: p.nombre,
        descripcion: "Previa",
        sistema: false,
        permisos: p.permisos.filter((x) => x !== "core:estructuras.read_sensible"),
      },
    });
    expect(await actualizarPlantilla(e.forTenant(tenantId), original, p)).toMatchObject({
      count: 1,
    });
    expect(await actualizarPlantilla(e.forTenant(tenantId), original, p)).toMatchObject({
      count: 0,
    });
  });
});
