import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("anclaje durable del prefijo verificado", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it.each(["cola sustituida", "microsegundo"])("conserva el anclaje tras %s", async (caso) => {
    const tenant = await e.admin.tenant.create({
      data: { slug: `aud-ancla-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
    });
    const ctx = mod.crearContexto({ tenantId: tenant.id, actor: { tipo: "system" }, rol: "owner" });
    const escribir = (nombre: string) =>
      mod.executeCapability(ctx, "core.cuentas.create", { nombre });
    expect(await escribir("Una")).toMatchObject({ ok: true });
    expect(await escribir("Dos")).toMatchObject({ ok: true });
    expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 2 });
    const antes = await e.admin.auditoriaCabeza.findUniqueOrThrow({
      where: { tenantId: ctx.tenantId },
    });
    if (caso === "cola sustituida") {
      await e.admin.auditEvent.deleteMany({ where: { tenantId: ctx.tenantId, seq: 2 } });
      expect(await escribir("Sustituta")).toMatchObject({ ok: true });
    } else {
      await e.admin.$executeRaw`UPDATE core.audit_events
        SET created_at = created_at + interval '1 microsecond'
        WHERE tenant_id = ${ctx.tenantId}::uuid AND seq = 1`;
    }
    for (let n = 0; n < 2; n++)
      expect(await ctx.auditoria.verificar()).toMatchObject({ ok: false });
    expect(
      await e.admin.auditoriaCabeza.findUnique({ where: { tenantId: ctx.tenantId } }),
    ).toMatchObject({
      ultimoSeq: antes.ultimoSeq,
      ultimoHash: antes.ultimoHash,
      huellaPrefijo: antes.huellaPrefijo,
      verificacionOk: false,
    });
  });

  it.each([false, true])(
    "detecta microsegundos en cola sin verificar (prefijo=%s)",
    async (prefijo) => {
      const tenant = await e.admin.tenant.create({
        data: { slug: `aud-fecha-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
      });
      const ctx = mod.crearContexto({
        tenantId: tenant.id,
        actor: { tipo: "system" },
        rol: "owner",
      });
      if (prefijo) {
        expect(
          await mod.executeCapability(ctx, "core.cuentas.create", { nombre: "Prefijo" }),
        ).toMatchObject({ ok: true });
        expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true });
      }
      expect(
        await mod.executeCapability(ctx, "core.cuentas.create", { nombre: "Cola" }),
      ).toMatchObject({ ok: true });
      const seq = prefijo ? 2 : 1;
      await e.admin.$executeRaw`UPDATE core.audit_events
      SET created_at = created_at + interval '1 microsecond'
      WHERE tenant_id = ${ctx.tenantId}::uuid AND seq = ${seq}`;
      expect(await ctx.auditoria.verificar()).toMatchObject({ ok: false, primeraRota: seq });
    },
  );
});
