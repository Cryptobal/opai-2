import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";
describe.skipIf(!urlPropietario)("regresiones de auditoría de IA y plataforma", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  const propios: string[] = [];
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });
  afterEach(async () => {
    // La rotación global de KEK de secretos-db no debe encontrar fixtures con otra KEK.
    await e.admin.secreto.deleteMany({ where: { tenantId: { in: propios } } });
    await e.admin.claveTenant.deleteMany({ where: { tenantId: { in: propios } } });
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  const tenant = async () => {
    const fila = await e.admin.tenant.create({
      data: {
        slug: `aud-reg-${randomUUID()}`,
        nombre: "Prueba",
        vertical: "seguridad",
      },
    });
    propios.push(fila.id);
    return fila.id;
  };
  const contexto = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
  it.each(["lectura", "escritura"] as const)(
    "el diagnóstico IA sobrevive al rollback de %s",
    async (efecto) => {
      const tenantId = await tenant();
      const ctx = contexto(tenantId);
      vi.stubEnv("OPAI_SECRETS_KEY", randomBytes(32).toString("base64"));
      expect(
        await mod.executeCapability(ctx, "core.integraciones.configurar", {
          proveedor: "ia_openai",
          modalidad: "propia",
          config: { modelos: { economica: "modelo-test" } },
        }),
      ).toMatchObject({ ok: true });
      expect(
        await mod.executeCapability(ctx, "core.integraciones.set_secreto", {
          proveedor: "ia_openai",
          nombre: "api_key",
          valor: randomUUID(),
        }),
      ).toMatchObject({ ok: true });
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("caída simulada", { status: 500 })),
      );
      const id = `core.prueba_rollback_${efecto}`;
      mod.registrarCapacidades([
        mod.defineCapability({
          id,
          descripcion: "Prueba de rollback real con diagnóstico durable de IA propia.",
          permiso: null,
          input: z.object({}),
          output: z.object({}),
          efecto,
          dryRun: true,
          async handler(c) {
            await c.db.cuenta.create({ data: { tenantId, nombre: "Debe revertirse" } });
            const ia = await mod.iaDe(c, "economica");
            await ia!.completar({ prompt: "prueba" });
            return {};
          },
        }),
      ]);
      expect(await mod.executeCapability(ctx, id, {})).toMatchObject({ ok: false });
      expect(await e.admin.cuenta.count({ where: { tenantId } })).toBe(0);
      expect(
        await e.admin.auditEvent.count({
          where: { tenantId, capability: "core.ia.respaldo_agotado" },
        }),
      ).toBe(1);
      expect(
        await e.admin.integracion.findUniqueOrThrow({
          where: { tenantId_proveedor: { tenantId, proveedor: "ia_openai" } },
        }),
      ).toMatchObject({ estado: "error", ultimoError: expect.any(String) });
      expect(
        await e.admin.evento.count({ where: { tenantId, tipo: "core.integracion.error" } }),
      ).toBe(1);
      expect(await ctx.auditoria.verificar()).toMatchObject({
        ok: true,
      });
      // El camino real de lectura también debe conservar el aviso, sin duplicar la notificación.
      expect(
        await mod.executeCapability(ctx, "core.ia.probar", { clase: "economica" }),
      ).toMatchObject({ ok: false });
      expect(
        await e.admin.auditEvent.count({
          where: { tenantId, capability: "core.ia.respaldo_agotado" },
        }),
      ).toBe(2);
      expect(
        await e.admin.evento.count({ where: { tenantId, tipo: "core.integracion.error" } }),
      ).toBe(1);
    },
  );
  it("plataforma con empresa seleccionada audita solo en el tenant objetivo", async () => {
    const actual = await tenant();
    const objetivo = await tenant();
    const usuario = {
      id: randomUUID(),
      email: "prueba@example.test",
      nombre: "Prueba",
      platformRole: "owner" as const,
    };
    const ctx = mod.crearContexto({
      tenantId: actual,
      actor: { tipo: "system" },
      usuario,
      medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(ctx, "platform.tenants.update", {
      tenantId: objetivo,
      nombre: "Nombre auditado",
    });
    expect(r).toMatchObject({ ok: true });
    expect(await e.admin.auditEvent.count({ where: { tenantId: actual } })).toBe(0);
    expect(
      await e.admin.auditEvent.findFirstOrThrow({ where: { tenantId: objetivo } }),
    ).toMatchObject({ capability: "platform.tenants.update", seq: 1 });
    expect(
      await mod.executeCapability(contexto(actual), "platform.tenants.update", {
        tenantId: objetivo,
        nombre: "Sin permiso",
      }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
