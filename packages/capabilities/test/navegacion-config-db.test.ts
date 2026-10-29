// Preferencias de navegación (Brief 05, §4.3 y §12) contra Postgres real, con el rol `opai_app`
// efímero sin BYPASSRLS: aisladas por tenant y por usuario, con dryRun e idempotencia.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { agregarAAuditoria, enTransaccion, verificarAuditoria } from "@opai/db";

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

  // Regresión del PR #109 (QA en vivo, B1): "cambiar el tema varias veces seguidas" mostraba en
  // pantalla el error crudo de Prisma (55P03, lock_timeout) y el tema guardado no era el último
  // elegido. Varias escrituras reales del mismo tenant (sin versionEsperada, como el formulario de
  // preferencias) no deben dejar la base inconsistente ni filtrar el error crudo.
  it("N escrituras concurrentes de preferencias del mismo tenant no corrompen la cadena", async () => {
    const tenantId = await crearTenant("RafagaPreferencias");
    const usuarioId = await miembroDe(tenantId);
    const temas = ["claro", "oscuro", "sistema", "claro", "oscuro", "sistema", "claro", "oscuro"];
    const resultados = await Promise.all(
      temas.map((valor) =>
        mod.executeCapability(ctxUsuario(tenantId, usuarioId), "core.config.set", {
          modulo: "core",
          clave: "preferencias_tema",
          valor,
        }),
      ),
    );
    // Nunca un error crudo de Prisma/Postgres: cualquier fallo queda con el mensaje genérico.
    for (const r of resultados)
      if (!r.ok) expect(r.error.message).toBe("No pudimos completar la operación. Intenta de nuevo.");
    const exitosas = resultados.filter((r) => r.ok);
    expect(exitosas.length).toBeGreaterThan(0);
    const fila = await e.forTenant(tenantId).ajuste.findFirst({
      where: { ambito: "usuario", sujetoId: usuarioId, modulo: "core", clave: "preferencias_tema" },
    });
    // El valor final coincide con el de la última escritura que de verdad aplicó (mayor versión).
    const ultima = exitosas.reduce((a, b) =>
      (a as { data: { version: number } }).data.version >
      (b as { data: { version: number } }).data.version
        ? a
        : b,
    ) as { ok: true; data: { valor: string; version: number } };
    expect(fila?.valor).toBe(ultima.data.valor);
    expect(fila?.version).toBe(ultima.data.version);
    expect((await verificarAuditoria(tenantId)).ok).toBe(true);
  });

  // Mismo escenario, pero con el lock del tenant tomado por otra transacción (la cola de
  // auditoría de Neon bajo ráfaga, incidente del 28-oct-2026): hoy sí puede fallar con 55P03, pero
  // nunca con el mensaje crudo, y la base queda íntegra (sin escritura a medias).
  it("con el lock del tenant tomado, el 55P03 llega como error genérico y sin escritura a medias", async () => {
    const tenantId = await crearTenant("LockPreferencias");
    const usuarioId = await miembroDe(tenantId);
    let conLock: () => void = () => undefined;
    const tomado = new Promise<void>((r) => (conLock = r));
    let soltar: () => void = () => undefined;
    const liberado = new Promise<void>((r) => (soltar = r));
    const retenedora = enTransaccion(
      tenantId,
      async (tx) => {
        await agregarAAuditoria(tx, tenantId, {
          actorTipo: "user",
          actorId: null,
          viaUserId: null,
          capability: "core.empresa.update",
          entityType: null,
          entityId: null,
          payload: {},
        });
        conLock();
        await liberado;
      },
      { timeoutMs: 14_000 },
    );
    await tomado;
    const r = await mod.executeCapability(ctxUsuario(tenantId, usuarioId), "core.config.set", {
      modulo: "core",
      clave: "preferencias_tema",
      valor: "oscuro",
    });
    soltar();
    await retenedora;
    expect(r).toMatchObject({
      ok: false,
      error: { code: "INTERNAL", message: "No pudimos completar la operación. Intenta de nuevo." },
    });
    expect(
      await e.forTenant(tenantId).ajuste.findFirst({
        where: { ambito: "usuario", sujetoId: usuarioId, modulo: "core", clave: "preferencias_tema" },
      }),
    ).toBeNull();
    expect((await verificarAuditoria(tenantId)).ok).toBe(true);
  }, 20_000);

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
