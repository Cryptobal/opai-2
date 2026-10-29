// Preferencias de navegación (Brief 05, §4.3 y §12) contra Postgres real, con el rol `opai_app`
// efímero sin BYPASSRLS: aisladas por tenant y por usuario, con dryRun e idempotencia.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("navegación: preferencias de usuario en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const crearTenant = async (nombre: string) =>
    (
      await e.admin.tenant.create({
        data: { slug: `nav-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" },
      })
    ).id;

  // Las preferencias de ámbito usuario exigen que el usuario sea miembro (trigger usuario_miembro).
  const miembroDe = async (...tenantIds: string[]) => {
    const id = randomUUID();
    await e.admin.user.create({ data: { id, name: "Prueba", email: `nav-${id}@test.opai.cl` } });
    await e.admin.membership.createMany({
      data: tenantIds.map((tenantId) => ({
        tenantId,
        userId: id,
        rol: "owner",
        portales: ["erp"],
      })),
    });
    return id;
  };

  const ctxUsuario = (tenantId: string, usuarioId: string) =>
    mod.crearContexto({
      tenantId,
      portal: "erp",
      portalesMembresia: ["erp"],
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Prueba", email: "prueba@opai.cl", platformRole: null },
      rol: "owner",
    });

  it("un mismo usuario tiene área principal separada por empresa", async () => {
    const tenantA = await crearTenant("A");
    const tenantB = await crearTenant("B");
    const usuarioId = await miembroDe(tenantA, tenantB);
    const r = await mod.executeCapability(ctxUsuario(tenantA, usuarioId), "core.config.set", {
      modulo: "core",
      clave: "navegacion_area_principal",
      valor: "personas",
    });
    expect(r.ok).toBe(true);
    const enA = await mod.executeCapability(ctxUsuario(tenantA, usuarioId), "core.config.get", {
      modulo: "core",
    });
    const enB = await mod.executeCapability(ctxUsuario(tenantB, usuarioId), "core.config.get", {
      modulo: "core",
    });
    type Fila = { clave: string; valor: unknown; origen: string };
    const de = (res: typeof enA, clave: string) =>
      (res.ok ? (res.data as Fila[]) : []).find((f) => f.clave === clave);
    expect(de(enA, "navegacion_area_principal")).toMatchObject({
      valor: "personas",
      origen: "usuario",
    });
    expect(de(enB, "navegacion_area_principal")).toMatchObject({ valor: null, origen: "defecto" });
  });

  it("dos usuarios del mismo tenant no leen ni escriben los fijados del otro", async () => {
    const tenantId = await crearTenant("C");
    const u1 = await miembroDe(tenantId);
    const u2 = await miembroDe(tenantId);
    const fijado = {
      tipo: "entrada",
      href: "/cuentas",
      etiqueta: "Cuentas",
      fijadoEn: new Date().toISOString(),
    };
    await mod.executeCapability(ctxUsuario(tenantId, u1), "core.config.set", {
      modulo: "core",
      clave: "navegacion_fijados",
      valor: [fijado],
    });
    const deU1 = await mod.executeCapability(ctxUsuario(tenantId, u1), "core.config.get", {
      modulo: "core",
    });
    const deU2 = await mod.executeCapability(ctxUsuario(tenantId, u2), "core.config.get", {
      modulo: "core",
    });
    type Fila = { clave: string; valor: unknown };
    const de = (res: typeof deU1, clave: string) =>
      (res.ok ? (res.data as Fila[]) : []).find((f) => f.clave === clave);
    expect(de(deU1, "navegacion_fijados")?.valor).toEqual([fijado]);
    expect(de(deU2, "navegacion_fijados")?.valor).toEqual([]);
  });

  it("dryRun no persiste y la escritura real deja auditoría (ADR-034)", async () => {
    const tenantId = await crearTenant("D");
    const usuarioId = await miembroDe(tenantId);
    const ctx = ctxUsuario(tenantId, usuarioId);
    await mod.executeCapability(
      ctx,
      "core.config.set",
      { modulo: "core", clave: "navegacion_area_abierta", valor: "clientes" },
      { dryRun: true },
    );
    const trasDryRun = await mod.executeCapability(ctx, "core.config.get", { modulo: "core" });
    type Fila = { clave: string; valor: unknown };
    const de = (res: typeof trasDryRun, clave: string) =>
      (res.ok ? (res.data as Fila[]) : []).find((f) => f.clave === clave);
    expect(de(trasDryRun, "navegacion_area_abierta")?.valor).toBeNull();
    await mod.executeCapability(ctx, "core.config.set", {
      modulo: "core",
      clave: "navegacion_area_abierta",
      valor: "clientes",
    });
    const auditados = await e.admin.auditEvent.findMany({
      where: { tenantId, capability: "core.config.set" },
    });
    expect(auditados.length).toBeGreaterThan(0);
  });

  it("rechaza un sexto fijado (D3, validado por el esquema)", async () => {
    const tenantId = await crearTenant("E");
    const usuarioId = await miembroDe(tenantId);
    const seis = Array.from({ length: 6 }, (_, i) => ({
      tipo: "entrada" as const,
      href: `/x${i}`,
      etiqueta: `X${i}`,
      fijadoEn: new Date().toISOString(),
    }));
    const r = await mod.executeCapability(ctxUsuario(tenantId, usuarioId), "core.config.set", {
      modulo: "core",
      clave: "navegacion_fijados",
      valor: seis,
    });
    expect(r.ok).toBe(false);
  });

  it("CAS evita dos escrituras obsoletas, incluso tras reiniciar (sin ABA)", async () => {
    const tenantId = await crearTenant("Concurrencia");
    const usuarioId = await miembroDe(tenantId);
    const input = { modulo: "core", clave: "navegacion_area_principal", versionEsperada: 0 };
    const resultados = await Promise.all(
      ["clientes", "personas"].map((valor) =>
        mod.executeCapability(ctxUsuario(tenantId, usuarioId), "core.config.set", {
          ...input,
          valor,
        }),
      ),
    );
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.filter((r) => !r.ok && r.error.code === "CONFLICT")).toHaveLength(1);
    const reset = await mod.executeCapability(ctxUsuario(tenantId, usuarioId), "core.config.set", {
      ...input,
      valor: null,
      versionEsperada: 1,
    });
    expect(reset.ok).toBe(true);
    const obsoleto = await mod.executeCapability(
      ctxUsuario(tenantId, usuarioId),
      "core.config.set",
      {
        ...input,
        valor: "clientes",
        versionEsperada: 1,
      },
    );
    expect(obsoleto).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("la misma clave idempotente no duplica versión ni auditoría", async () => {
    const tenantId = await crearTenant("Idempotencia");
    const usuarioId = await miembroDe(tenantId);
    const input = { modulo: "core", clave: "navegacion_area_abierta", valor: "clientes" };
    const idempotencyKey = randomUUID();
    const uno = await mod.executeCapability(
      ctxUsuario(tenantId, usuarioId),
      "core.config.set",
      input,
      { idempotencyKey },
    );
    const dos = await mod.executeCapability(
      ctxUsuario(tenantId, usuarioId),
      "core.config.set",
      input,
      { idempotencyKey },
    );
    expect(uno.ok).toBe(true);
    expect(dos).toMatchObject({ ...uno, repetida: true });
    expect(await e.admin.ajuste.findMany({ where: { tenantId } })).toHaveLength(1);
    expect(
      await e.admin.auditEvent.findMany({ where: { tenantId, capability: "core.config.set" } }),
    ).toHaveLength(1);
  });
});
