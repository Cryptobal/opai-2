// CAR-78 · B1: PIN de terreno contra Postgres real. RR. HH. asigna y restablece, la persona lo cambia
// y la credencial de una empresa nunca se ve ni se toca desde otra (criterio 5 del frente).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("PIN de terreno en base real (CAR-78 B1)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const medidor = { registrar: async () => undefined };
  const t = { A: "", B: "" };
  const persona = { A: "", B: "" };
  const userA = randomUUID();

  const ctx = (tenantId: string, rol: "owner" | "viewer" = "owner", usuario?: string) =>
    mod.crearContexto({
      tenantId,
      actor: usuario ? { tipo: "user", id: usuario } : { tipo: "system" },
      portal: rol === "viewer" ? "trabajador" : "erp",
      portalesMembresia: rol === "viewer" ? ["trabajador"] : ["erp"],
      rol,
      medidor,
    });

  const ejecutar = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      const tenant = await e.admin.tenant.create({
        data: {
          slug: `pin-${k.toLowerCase()}-${sufijo}`,
          nombre: `Pin ${k}`,
          vertical: "seguridad",
        },
      });
      t[k] = tenant.id;
    }
    // Misma persona (mismo RUT) en las dos empresas: la credencial de una no debe servir en la otra.
    const rut = "12345678-5";
    await e.admin.user.create({
      data: { id: userA, name: "Persona A", email: `pin-${randomUUID().slice(0, 8)}@example.test` },
    });
    await e.admin.membership.create({
      data: { tenantId: t.A, userId: userA, rol: "viewer", portales: ["trabajador"] },
    });
    persona.A = (
      await e.admin.persona.create({
        data: { tenantId: t.A, nombres: "Ana", apellidos: "Prueba", rut, usuarioId: userA },
      })
    ).id;
    persona.B = (
      await e.admin.persona.create({
        data: { tenantId: t.B, nombres: "Ana", apellidos: "Prueba", rut },
      })
    ).id;
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("la vista previa no escribe y un PIN débil se rechaza", async () => {
    const o = ctx(t.A);
    const previa = await ejecutar(
      o,
      "core.credenciales_terreno.asignar_pin",
      { personaId: persona.A, pin: "482915" },
      { dryRun: true },
    );
    expect(previa.ok).toBe(true);
    expect(await e.admin.credencialTerreno.count({ where: { tenantId: t.A } })).toBe(0);
    for (const pin of ["123456", "000000", "12345"]) {
      const r = await ejecutar(o, "core.credenciales_terreno.asignar_pin", {
        personaId: persona.A,
        pin,
      });
      expect(r.ok).toBe(false);
    }
  });

  it("asigna el PIN: solo se guarda el hash y debe cambiarlo", async () => {
    const o = ctx(t.A);
    const r = await ejecutar(o, "core.credenciales_terreno.asignar_pin", {
      personaId: persona.A,
      pin: "482915",
    });
    expect(r.ok).toBe(true);
    const fila = await e.admin.credencialTerreno.findUniqueOrThrow({
      where: { personaId: persona.A },
    });
    expect(fila.pinHash).not.toContain("482915");
    expect(fila.debeCambiar).toBe(true);
    expect(fila.rut).toBe("12345678-5");
    const estado = await ejecutar(o, "core.credenciales_terreno.estado", { personaId: persona.A });
    expect(estado.ok && estado.data).toMatchObject({
      tienePin: true,
      debeCambiar: true,
      sinIngreso: null,
    });
    // El PIN nunca queda en la auditoría.
    const auditoria = await e.admin.auditEvent.findMany({
      where: { tenantId: t.A, capability: "core.credenciales_terreno.asignar_pin" },
    });
    expect(JSON.stringify(auditoria)).not.toContain("482915");
  });

  it("restablecer muestra el PIN temporal una vez y lo oculta al repetir la clave", async () => {
    const o = ctx(t.A);
    const clave = randomUUID();
    const primera = await ejecutar(
      o,
      "core.credenciales_terreno.restablecer",
      { personaId: persona.A },
      { idempotencyKey: clave },
    );
    expect(primera.ok && primera.data).toMatchObject({ aplicado: true, debeCambiar: true });
    const pin = primera.ok ? (primera.data as { pinTemporal: string }).pinTemporal : "";
    expect(pin).toMatch(/^\d{6}$/);
    const repetida = await ejecutar(
      o,
      "core.credenciales_terreno.restablecer",
      { personaId: persona.A },
      { idempotencyKey: clave },
    );
    expect(repetida.ok && (repetida.data as { pinTemporal: string | null }).pinTemporal).toBeNull();
  });

  it("la propia persona cambia su PIN; el actual incorrecto cuenta y bloquea", async () => {
    const o = ctx(t.A, "owner");
    await ejecutar(o, "core.credenciales_terreno.asignar_pin", {
      personaId: persona.A,
      pin: "482915",
    });
    const yo = ctx(t.A, "viewer", userA);
    const mal = await ejecutar(yo, "core.credenciales_terreno.cambiar_pin", {
      pinActual: "111112",
      pinNuevo: "735291",
    });
    expect(mal.ok).toBe(false);
    expect(
      (await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId: persona.A } }))
        .intentosFallidos,
    ).toBe(1);
    const ok = await ejecutar(yo, "core.credenciales_terreno.cambiar_pin", {
      pinActual: "482915",
      pinNuevo: "735291",
    });
    expect(ok.ok).toBe(true);
    const f = await e.admin.credencialTerreno.findUniqueOrThrow({
      where: { personaId: persona.A },
    });
    expect(f.debeCambiar).toBe(false);
    expect(f.intentosFallidos).toBe(0);
    expect(f.pinCambiadoEn).not.toBeNull();
    // Cinco fallos seguidos bloquean; después ni el PIN correcto cambia nada.
    for (let i = 0; i < 5; i++) {
      await ejecutar(yo, "core.credenciales_terreno.cambiar_pin", {
        pinActual: "111112",
        pinNuevo: "846201",
      });
    }
    const bloqueada = await e.admin.credencialTerreno.findUniqueOrThrow({
      where: { personaId: persona.A },
    });
    expect(bloqueada.bloqueadoHasta).not.toBeNull();
    const tarde = await ejecutar(yo, "core.credenciales_terreno.cambiar_pin", {
      pinActual: "735291",
      pinNuevo: "846201",
    });
    expect(tarde.ok).toBe(false);
  });

  it("al bloquearse desde «cambiar PIN» deja el rastro y avisa una sola vez a la persona y a RR. HH. (F5, N5)", async () => {
    const rrhhId = randomUUID();
    await e.admin.user.create({
      data: { id: rrhhId, name: "RRHH", email: `rrhh-${randomUUID().slice(0, 8)}@example.test` },
    });
    await e.admin.membership.create({
      data: { tenantId: t.A, userId: rrhhId, rol: "admin", portales: ["erp"] },
    });
    await e.admin.credencialTerreno.update({
      where: { personaId: persona.A },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });
    const antes = await e.admin.notificacion.count({ where: { tenantId: t.A } });
    const yo = ctx(t.A, "viewer", userA);
    for (let i = 0; i < 6; i++) {
      await ejecutar(yo, "core.credenciales_terreno.cambiar_pin", {
        pinActual: "111112",
        pinNuevo: "846201",
      });
    }
    const nuevos = await e.admin.notificacion.findMany({
      where: { tenantId: t.A },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    expect(await e.admin.notificacion.count({ where: { tenantId: t.A } })).toBe(antes + 2);
    expect(nuevos.map((n) => n.usuarioId).sort()).toEqual([rrhhId, userA].sort());
    expect(
      await e.admin.auditoriaGlobal.count({
        where: { capability: "seguridad.pin.bloqueo", entityId: userA },
      }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("una empresa no ve ni toca la credencial de otra (criterio 5)", async () => {
    const b = ctx(t.B);
    for (const [id, input] of [
      ["core.credenciales_terreno.estado", { personaId: persona.A }],
      ["core.credenciales_terreno.asignar_pin", { personaId: persona.A, pin: "482915" }],
      ["core.credenciales_terreno.restablecer", { personaId: persona.A }],
    ] as const) {
      const r = await ejecutar(b, id, input);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.error.code).toBe("NOT_FOUND");
    }
    // La persona B (mismo RUT) no tiene PIN aunque la A sí.
    const estadoB = await ejecutar(b, "core.credenciales_terreno.estado", { personaId: persona.B });
    expect(estadoB.ok && (estadoB.data as { tienePin: boolean }).tienePin).toBe(false);
    // El cambio de PIN de A tampoco alcanza a B: opera sobre la persona del usuario en SU empresa.
    const yoEnB = ctx(t.B, "viewer", userA);
    const r = await ejecutar(yoEnB, "core.credenciales_terreno.cambiar_pin", {
      pinActual: "735291",
      pinNuevo: "846201",
    });
    expect(r.ok).toBe(false);
  });

  it("sin permiso de personas no hay acceso", async () => {
    const yo = ctx(t.A, "viewer", userA);
    for (const [id, input] of [
      ["core.credenciales_terreno.estado", { personaId: persona.A }],
      ["core.credenciales_terreno.restablecer", { personaId: persona.A }],
    ] as const) {
      const r = await ejecutar(yo, id, input);
      expect(r.ok).toBe(false);
    }
  });
});
