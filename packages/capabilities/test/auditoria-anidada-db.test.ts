import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

// Una escritura auditada que ejecuta otra capacidad dentro de su transacción (como aprobar una
// solicitud de un agente o confirmar un plan del agente interno). Con el append en medio, la
// anidada pedía al pool (idempotencia) con el lock de auditoría tomado: el patrón del incidente
// del 28-oct-2026, que la guarda de @opai/db ahora rechaza. Los appends van al final.
describe.skipIf(!urlPropietario)("capacidad anidada en una escritura auditada", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  let tenantId = "";
  const salida = z.object({ id: z.string() });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    const interna = mod.defineCapability({
      id: "core.prueba_anidada.interna",
      descripcion: "Prueba: crea una cuenta; la ejecuta otra capacidad dentro de su transacción.",
      permiso: PERMISOS_CORE.cuentasManage,
      input: z.object({ nombre: z.string() }),
      output: salida,
      efecto: "escritura",
      dryRun: true,
      handler: async (ctx, input) =>
        ctx.db.cuenta.create({ data: { tenantId: ctx.tenantId, nombre: input.nombre } }),
    });
    const externa = mod.defineCapability({
      id: "core.prueba_anidada.externa",
      descripcion: "Prueba: crea una cuenta y ejecuta otra capacidad auditada con idempotencia.",
      permiso: PERMISOS_CORE.cuentasManage,
      input: z.object({ clave: z.string() }),
      output: salida,
      efecto: "escritura",
      dryRun: true,
      async handler(ctx, input) {
        const r = await mod.executeCapability(
          ctx,
          "core.prueba_anidada.interna",
          { nombre: "Anidada" },
          { idempotencyKey: input.clave },
        );
        if (!r.ok) throw new Error(`La anidada falló: ${r.error.code} ${r.error.message}`);
        return ctx.db.cuenta.create({ data: { tenantId: ctx.tenantId, nombre: "Externa" } });
      },
    });
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, interna, externa]);
    tenantId = (
      await e.admin.tenant.create({
        data: {
          slug: `aud-anidada-${randomUUID().slice(0, 8)}`,
          nombre: "Anidada",
          vertical: "aseo",
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la anidada completa su idempotencia y ambos appends quedan en orden, en la misma transacción", async () => {
    const ctx = mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });
    const clave = randomUUID();
    const r = await mod.executeCapability(ctx, "core.prueba_anidada.externa", { clave });
    expect(r).toMatchObject({ ok: true });
    const auditoria = await e.admin.auditEvent.findMany({
      where: { tenantId },
      orderBy: { seq: "asc" },
      select: { capability: true },
    });
    expect(auditoria.map((a) => a.capability)).toEqual([
      "core.prueba_anidada.interna",
      "core.prueba_anidada.externa",
    ]);
    const reserva = await e.admin.idempotencia.findFirst({ where: { tenantId, clave } });
    expect(reserva?.estado).toBe("hecha");
    expect(await e.admin.cuenta.count({ where: { tenantId } })).toBe(2);
    expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 2 });
  });
});
