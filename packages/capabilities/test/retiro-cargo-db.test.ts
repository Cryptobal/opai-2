import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";

// Datos históricos sembrados directamente: create debe estar bloqueado incluso para owner.
describe("CA-2: cargo retirado, lectura y aislamiento reales", () => {
  let e: Entorno;
  let tenantId: string;
  let otroId: string;
  let cargoId: string;
  let id: string;
  const ctx = (tenant = tenantId, rol: "owner" | "viewer" = "owner") =>
    mod.crearContexto({ tenantId: tenant, rol, actor: { tipo: "system" } });
  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const nuevo = () =>
      e.admin.tenant.create({
        data: {
          slug: `retiro-${randomUUID()}`,
          nombre: "Prueba",
          vertical: "seguridad",
        },
      });
    tenantId = (await nuevo()).id;
    otroId = (await nuevo()).id;
    cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Catálogo" } })).id;
    id = (
      await e.admin.estructuraSueldo.create({
        data: {
          tenantId,
          nivel: "cargo",
          cargoId,
          estado: "archivada",
          sueldoBase: 500000,
          colacion: 0,
          movilizacion: 0,
          gratificacion: "ninguna",
          vigenteDesde: new Date("2025-01-01"),
          items: { create: [{ tenantId, nombre: "Bono", tipo: "bono_fijo", monto: 5000 }] },
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  it("owner conserva la versión y sus bonos; el catálogo no revela montos", async () => {
    expect(await mod.executeCapability(ctx(), "core.estructuras.get", { id })).toMatchObject({
      ok: true,
      data: {
        estado: "archivada",
        sueldoBase: 500000,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "ninguna",
        items: [expect.objectContaining({ monto: 5000 })],
      },
    });
    expect(
      await mod.executeCapability(ctx(), "core.estructuras.list", {
        nivel: "cargo",
        refId: cargoId,
      }),
    ).toMatchObject({ ok: true, data: [expect.objectContaining({ id, estado: "archivada" })] });
    const r = await mod.executeCapability(ctx(), "core.cargos.list", {});
    expect(r.ok).toBe(true);
    if (r.ok)
      for (const fila of r.data as object[]) expect(fila).not.toHaveProperty("sueldoVigente");
    const sensible = await e.admin.auditEvent.findMany({
      where: {
        tenantId,
        capability: "core.estructuras.read_sensible",
      },
    });
    expect(sensible).toHaveLength(2);
    expect(JSON.stringify(sensible)).not.toContain("500000");
  });
  it("viewer ve el archivo con montos y bonos ocultos, incluso con cargo no sensible", async () => {
    expect(
      await mod.executeCapability(ctx(tenantId, "viewer"), "core.estructuras.get", { id }),
    ).toMatchObject({
      ok: true,
      data: { sensible: true, sueldoBase: null, items: [expect.objectContaining({ monto: null })] },
    });
  });
  it("otro tenant no enumera el archivo ni lo modifica", async () => {
    expect(
      await mod.executeCapability(ctx(otroId), "core.estructuras.list", {
        nivel: "cargo",
        refId: cargoId,
      }),
    ).toMatchObject({ ok: true, data: [] });
    for (const ajeno of [id, randomUUID()]) {
      expect(
        await mod.executeCapability(ctx(otroId), "core.estructuras.get", { id: ajeno }),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
      expect(
        await mod.executeCapability(ctx(otroId), "core.estructuras.anular", {
          id: ajeno,
          motivo: "No autorizado",
        }),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
  });
  it("ningún rol crea/versiona/anula cargo; preview tampoco escribe", async () => {
    const antes = await e.admin.estructuraSueldo.findUnique({
      where: { id },
      include: { items: true },
    });
    for (const rol of ["owner", "viewer"] as const)
      for (const dryRun of [true, false]) {
        expect(
          await mod.executeCapability(
            ctx(tenantId, rol),
            "core.estructuras.create",
            {
              nivel: "cargo",
              cargoId,
              sueldoBase: 1,
              vigenteDesde: "2027-01-01",
            },
            { dryRun, idempotencyKey: randomUUID() },
          ),
        ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
        expect(
          await mod.executeCapability(
            ctx(tenantId, rol),
            "core.estructuras.anular",
            { id, motivo: "No debe cambiar" },
            { dryRun },
          ),
        ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      }
    expect(
      await e.admin.estructuraSueldo.findUnique({ where: { id }, include: { items: true } }),
    ).toEqual(antes);
    expect(await e.admin.estructuraSueldo.count({ where: { tenantId } })).toBe(1);
  });
  it("si falla la auditoría, no revela el historial", async () => {
    const c = ctx();
    c.auditoria.registrar = async () => {
      throw new Error("Auditoría no disponible");
    };
    expect(
      await mod.executeCapability(c, "core.estructuras.list", { nivel: "cargo", refId: cargoId }),
    ).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
  });
});
