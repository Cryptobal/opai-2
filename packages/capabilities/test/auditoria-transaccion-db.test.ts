import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("append concurrente dentro de una sola transacción", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  let tenantId: string;
  let primerCargo: string;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantId = (
      await e.admin.tenant.create({
        data: {
          slug: `aud-tx-${randomUUID()}`,
          nombre: "Prueba",
          vertical: "seguridad",
        },
      })
    ).id;
    for (const nombre of ["Sensible A", "Sensible B"]) {
      const cargo = await e.forTenant(tenantId).cargo.create({
        data: {
          tenantId,
          nombre,
          sueldoSensible: true,
        },
      });
      if (nombre === "Sensible A") primerCargo = cargo.id;
      await e.forTenant(tenantId).estructuraSueldo.create({
        data: {
          tenantId,
          nivel: "cargo",
          cargoId: cargo.id,
          sueldoBase: 100,
          colacion: 0,
          movilizacion: 0,
          gratificacion: "legal_25",
          vigenteDesde: new Date("2026-01-01"),
          vigenteHasta: nombre === "Sensible A" ? new Date("2026-02-01") : null,
        },
      });
    }
    await e.forTenant(tenantId).estructuraSueldo.create({
      data: {
        tenantId,
        nivel: "cargo",
        cargoId: primerCargo,
        sueldoBase: 200,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "legal_25",
        vigenteDesde: new Date("2026-02-01"),
      },
    });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it.each(["core.cargos.list", "core.estructuras.list"])(
    "%s conserva la cadena; solo estructuras revela montos",
    async (id) => {
      const ctx = mod.crearContexto({
        tenantId,
        rol: "supervisor",
        actor: { tipo: "user", id: randomUUID() },
        portal: "erp",
        portalesMembresia: ["erp"],
        permisosRol: [
          "core:cargos.read",
          "core:estructuras.read",
          "core:estructuras.read_sensible",
          "core:audit.read",
        ],
        medidor: { registrar: async () => undefined },
      });
      const antes = await e.admin.auditEvent.count({ where: { tenantId } });
      const sensiblesAntes = await e.admin.auditEvent.count({
        where: { tenantId, capability: "core.estructuras.read_sensible" },
      });
      const input = id === "core.estructuras.list" ? { nivel: "cargo", refId: primerCargo } : {};
      expect(await mod.executeCapability(ctx, id, input)).toMatchObject({ ok: true });
      expect(
        await e.admin.auditEvent.count({
          where: { tenantId, capability: "core.estructuras.read_sensible" },
        }),
      ).toBe(sensiblesAntes + (id === "core.estructuras.list" ? 1 : 0));
      expect(await ctx.auditoria.verificar()).toMatchObject({
        ok: true,
        ultimoSeq: antes + (id === "core.estructuras.list" ? 2 : 0),
      });
    },
  );

  it("un fallo de append concurrente revierte también el primero y la escritura", async () => {
    const ctx = mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner" });
    const antes = await e.admin.auditEvent.count({ where: { tenantId } });
    await expect(
      ctx.transaccion(async (tx) => {
        await tx.cuenta.create({ data: { tenantId, nombre: "Debe revertirse" } });
        await Promise.all([
          ctx.auditoria.registrar(tx, {
            tenantId,
            actor: ctx.actor,
            capability: "core.prueba_ok",
            payload: {},
          }),
          ctx.auditoria.registrar(tx, {
            tenantId,
            actor: ctx.actor,
            capability: "core.prueba_fallo",
            payload: { noJson: 1n },
          }),
        ]);
      }),
    ).rejects.toThrow();
    expect(await e.admin.auditEvent.count({ where: { tenantId } })).toBe(antes);
    expect(await e.admin.cuenta.count({ where: { tenantId } })).toBe(0);
    expect(await ctx.auditoria.verificar()).toMatchObject({
      ok: true,
    });
  });
});
