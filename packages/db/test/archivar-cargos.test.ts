import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { archivarCargos } from "../scripts/archivar-cargos-nucleo";
import { type Entorno, prepararEntorno } from "./entorno";

describe("archivado D10 en Postgres local", () => {
  let e: Entorno;
  let a: string;
  let b: string;
  const filas = () =>
    e.admin.estructuraSueldo.findMany({
      where: { tenantId: { in: [a, b] } },
      include: { items: true },
      orderBy: { id: "asc" },
    });
  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = () =>
      e.admin.tenant.create({
        data: {
          slug: `archivo-${randomUUID()}`,
          nombre: "Prueba",
          vertical: "seguridad",
        },
      });
    a = (await nuevo()).id;
    b = (await nuevo()).id;
    for (const tenantId of [a, b]) {
      const cargo = await e.admin.cargo.create({ data: { tenantId, nombre: "Cargo" } });
      for (const estado of ["vigente", "anulada"]) {
        await e.admin.estructuraSueldo.create({
          data: {
            tenantId,
            nivel: "cargo",
            cargoId: cargo.id,
            estado,
            sueldoBase: 500000,
            colacion: 0,
            movilizacion: 0,
            gratificacion: "ninguna",
            vigenteDesde: new Date("2025-01-01"),
            items: { create: [{ tenantId, tipo: "bono_fijo", nombre: "Bono", monto: 1000 }] },
          },
        });
      }
      const persona = await e.admin.persona.create({
        data: {
          tenantId,
          nombres: "Persona",
          apellidos: "Prueba",
          rut: "12345678-5",
        },
      });
      await e.admin.estructuraSueldo.create({
        data: {
          tenantId,
          nivel: "persona",
          personaId: persona.id,
          sueldoBase: 600000,
          vigenteDesde: new Date("2025-01-01"),
        },
      });
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  it("dry-run no escribe; dos corridas conservan datos, ítems, otros niveles y tenant", async () => {
    const antes = await filas();
    expect(await archivarCargos(e.admin, { tenantId: a, dryRun: true })).toEqual({
      candidatos: 1,
      archivados: 0,
    });
    expect(await filas()).toEqual(antes);
    expect(await archivarCargos(e.admin, { tenantId: a, dryRun: false })).toEqual({
      candidatos: 1,
      archivados: 1,
    });
    const despues = await filas();
    expect(despues).toEqual(
      antes.map((f) =>
        f.tenantId === a && f.nivel === "cargo" && f.estado === "vigente"
          ? { ...f, estado: "archivada", updatedAt: expect.any(Date) }
          : f,
      ),
    );
    expect(await archivarCargos(e.admin, { tenantId: a, dryRun: false })).toEqual({
      candidatos: 0,
      archivados: 0,
    });
    expect(await filas()).toEqual(despues);
  });
  it("dos aplicaciones concurrentes archivan cada fila una vez", async () => {
    const r = await Promise.all(
      [1, 2].map(() => archivarCargos(e.admin, { tenantId: b, dryRun: false })),
    );
    expect(r.reduce((n, x) => n + x.archivados, 0)).toBe(1);
  });
});
