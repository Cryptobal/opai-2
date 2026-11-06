// CAR-78 · B1: ingreso con RUT + PIN contra Postgres real. Sin enumeración, bloqueo por intentos, solo
// portales de terreno y aislamiento entre empresas (criterio 5 del frente).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPin } from "@opai/db";
import { digitoVerificador, formatearRut } from "@opai/domain";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { verificarRutYPin } from "../src/pin-verificacion";

/** RUT canónico válido a partir de su cuerpo. */
const rutDe = (cuerpo: string) => `${cuerpo}-${digitoVerificador(cuerpo)}`;
/** RUT distintos en cada corrida: la base de pruebas conserva las filas de corridas anteriores. */
const BASE = 30_000_000 + Math.floor(Math.random() * 5_000_000);
const RUT_A = rutDe(String(BASE));
const RUT_B = rutDe(String(BASE + 1));
const PIN_A = "482915";
const PIN_B = "735291";

describe.skipIf(!urlPropietario)("ingreso con RUT + PIN (CAR-78 B1)", () => {
  let e: Entorno;
  let auth: Auth;
  const t = { A: "", B: "" };
  const userA = randomUUID();
  const sufijo = randomUUID().slice(0, 8);

  async function persona(
    tenantId: string,
    rut: string,
    pin: string,
    opciones: { userId?: string; portales?: string[]; debeCambiar?: boolean } = {},
  ) {
    const userId =
      opciones.userId ??
      (
        await e.admin.user.create({
          data: { name: "P", email: `p-${randomUUID().slice(0, 8)}@prueba.opai.cl` },
        })
      ).id;
    await e.admin.membership.create({
      data: { tenantId, userId, rol: "viewer", portales: opciones.portales ?? ["trabajador"] },
    });
    const p = await e.admin.persona.create({
      data: { tenantId, nombres: "N", apellidos: "A", rut, usuarioId: userId },
    });
    await e.admin.credencialTerreno.create({
      data: {
        tenantId,
        personaId: p.id,
        rut,
        pinHash: await hashPin(pin),
        debeCambiar: opciones.debeCambiar ?? false,
      },
    });
    return { personaId: p.id, userId };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    ({ auth } = await import("../src/auth"));
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `pinv-${k.toLowerCase()}-${sufijo}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
    }
    await e.admin.user.create({
      data: { id: userA, name: "A", email: `a-${sufijo}@prueba.opai.cl` },
    });
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("acepta el RUT con puntos y el PIN correcto, y deja el rastro de seguridad", async () => {
    const { userId, personaId } = await persona(t.A, RUT_A, PIN_A, {
      userId: userA,
      debeCambiar: true,
    });
    const r = await verificarRutYPin(
      formatearRut(RUT_A),
      PIN_A,
      new Headers({ "x-forwarded-for": "10.0.0.1" }),
    );
    // PIN temporal de RR. HH.: correcto, pero NO hay sesión hasta elegir el propio (B3 del Revisor).
    expect(r).toEqual({ estado: "cambiar" });
    expect(
      (await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId } })).debeCambiar,
    ).toBe(true);
    // Un PIN nuevo débil o igual al temporal se rechaza sin tocar nada.
    for (const malo of ["123456", PIN_A]) {
      expect(await verificarRutYPin(RUT_A, PIN_A, null, new Date(), malo)).toMatchObject({
        estado: "nuevo_invalido",
      });
    }
    const ok = await verificarRutYPin(
      formatearRut(RUT_A),
      PIN_A,
      new Headers({ "x-forwarded-for": "10.0.0.1" }),
      new Date(),
      "735291",
    );
    expect(ok).toEqual({ estado: "ok", userId });
    const c = await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId } });
    expect(c.intentosFallidos).toBe(0);
    expect(c.debeCambiar).toBe(false);
    expect(c.pinCambiadoEn).not.toBeNull();
    // Desde entonces solo sirve el PIN nuevo.
    expect(await verificarRutYPin(RUT_A, PIN_A, null)).toBeNull();
    expect(await verificarRutYPin(RUT_A, "735291", null)).toEqual({ estado: "ok", userId });
    const hechos = await e.admin.auditoriaGlobal.findMany({
      where: { capability: "seguridad.pin.ingreso", entityId: userId },
    });
    expect(hechos.length).toBeGreaterThanOrEqual(1);
    for (const h of hechos) {
      expect(JSON.stringify(h)).not.toContain(PIN_A);
      expect(JSON.stringify(h)).not.toContain("735291");
      expect(JSON.stringify(h)).not.toContain("10.0.0.1");
    }
  });

  it("un usuario con ERP en otra empresa no entra con PIN (B2 del Revisor)", async () => {
    const rut = rutDe(String(BASE + 6));
    const a = await persona(t.A, rut, PIN_B);
    // El mismo usuario tiene ERP en la otra empresa: el PIN no debe poder abrírsela.
    await e.admin.membership.create({
      data: { tenantId: t.B, userId: a.userId, rol: "viewer", portales: ["erp"] },
    });
    expect(await verificarRutYPin(rut, PIN_B, null)).toBeNull();
    const c = await e.admin.credencialTerreno.findUniqueOrThrow({
      where: { personaId: a.personaId },
    });
    expect(c.intentosFallidos).toBe(1);
  });

  it("RUT inexistente, mal formado o PIN con formato inválido: mismo resultado, sin error", async () => {
    expect(await verificarRutYPin("99999999-9", PIN_A, null)).toBeNull();
    expect(await verificarRutYPin("no-es-rut", PIN_A, null)).toBeNull();
    expect(await verificarRutYPin(RUT_A, "12ab56", null)).toBeNull();
    expect(await verificarRutYPin(RUT_A, "485", null)).toBeNull();
  });

  it("bloquea tras 5 intentos fallidos durante 15 minutos, aun con el PIN correcto", async () => {
    const ahora = new Date("2026-11-08T12:00:00Z");
    const { personaId } = await persona(t.B, RUT_B, PIN_B);
    for (let i = 0; i < 5; i++)
      expect(await verificarRutYPin(RUT_B, "111112", null, ahora)).toBeNull();
    const c = await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId } });
    expect(c.bloqueadoHasta?.toISOString()).toBe("2026-11-08T12:15:00.000Z");
    // Bloqueada: el PIN correcto no entra y no mueve el contador.
    expect(await verificarRutYPin(RUT_B, PIN_B, null, new Date("2026-11-08T12:10:00Z"))).toBeNull();
    // Vencido el bloqueo, entra.
    expect(
      await verificarRutYPin(RUT_B, PIN_B, null, new Date("2026-11-08T12:16:00Z")),
    ).not.toBeNull();
    const hechos = await e.admin.auditoriaGlobal.findMany({
      where: { capability: "seguridad.pin.bloqueo" },
    });
    expect(hechos.length).toBeGreaterThanOrEqual(1);
  });

  it("respeta los ajustes de la empresa (3 intentos, 30 minutos)", async () => {
    const tenant = (
      await e.admin.tenant.create({
        data: { slug: `pinv-c-${sufijo}`, nombre: "C", vertical: "seguridad" },
      })
    ).id;
    await e.admin.ajuste.createMany({
      data: [
        {
          tenantId: tenant,
          ambito: "tenant",
          sujetoId: tenant,
          modulo: "core",
          clave: "terreno_pin_intentos_maximos",
          valor: 3,
        },
        {
          tenantId: tenant,
          ambito: "tenant",
          sujetoId: tenant,
          modulo: "core",
          clave: "terreno_pin_bloqueo_minutos",
          valor: 30,
        },
      ],
    });
    const { personaId } = await persona(tenant, rutDe(String(BASE + 2)), PIN_B);
    const ahora = new Date("2026-11-08T12:00:00Z");
    for (let i = 0; i < 3; i++)
      await verificarRutYPin(rutDe(String(BASE + 2)), "111112", null, ahora);
    const c = await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId } });
    expect(c.bloqueadoHasta?.toISOString()).toBe("2026-11-08T12:30:00.000Z");
  });

  it("el PIN no abre a quien tiene ERP, Supervisor o sin usuario", async () => {
    const erp = await persona(t.A, rutDe(String(BASE + 3)), PIN_B, {
      portales: ["trabajador", "erp"],
    });
    expect(await verificarRutYPin(rutDe(String(BASE + 3)), PIN_B, null)).toBeNull();
    const c = await e.admin.credencialTerreno.findUniqueOrThrow({
      where: { personaId: erp.personaId },
    });
    expect(c.intentosFallidos).toBe(1);
    // Sin usuario vinculado.
    const sinUsuario = await e.admin.persona.create({
      data: { tenantId: t.A, nombres: "S", apellidos: "U", rut: rutDe(String(BASE + 4)) },
    });
    await e.admin.credencialTerreno.create({
      data: {
        tenantId: t.A,
        personaId: sinUsuario.id,
        rut: rutDe(String(BASE + 4)),
        pinHash: await hashPin(PIN_B),
      },
    });
    expect(await verificarRutYPin(rutDe(String(BASE + 4)), PIN_B, null)).toBeNull();
  });

  it("el PIN de una empresa no abre a la persona de otra con el mismo RUT (criterio 5)", async () => {
    const rut = rutDe(String(BASE + 5));
    const a = await persona(t.A, rut, PIN_A);
    const b = await persona(t.B, rut, PIN_B);
    // Cada PIN entra solo a su propia empresa.
    expect(await verificarRutYPin(rut, PIN_A, null)).toEqual({ estado: "ok", userId: a.userId });
    expect(await verificarRutYPin(rut, PIN_B, null)).toEqual({ estado: "ok", userId: b.userId });
    expect(await verificarRutYPin(rut, "111112", null)).toBeNull();
    // El fallo contra una empresa no cuenta contra la otra.
    expect(
      (await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId: a.personaId } }))
        .intentosFallidos,
    ).toBe(1);
    expect(
      (await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId: b.personaId } }))
        .intentosFallidos,
    ).toBe(1);
  });

  it("sin membresía activa en la empresa de la credencial no entra (F6)", async () => {
    const rut = rutDe(String(BASE + 7));
    const a = await persona(t.A, rut, PIN_B);
    await e.admin.membership.updateMany({
      where: { tenantId: t.A, userId: a.userId },
      data: { estado: "suspendida" },
    });
    expect(await verificarRutYPin(rut, PIN_B, null)).toBeNull();
  });

  it("el endpoint de sesión es solo servidor y no abre sesión con MFA ni plataforma", async () => {
    const http = await auth.handler(
      new Request("http://localhost:3000/api/auth/opai/sesion-pin", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ userId: userA }),
      }),
    );
    expect(http.status).toBe(404);
    const conMfa = await e.admin.user.create({
      data: {
        name: "M",
        email: `m-${randomUUID().slice(0, 8)}@prueba.opai.cl`,
        twoFactorEnabled: true,
      },
    });
    await expect(auth.api.abrirSesionPin({ body: { userId: conMfa.id } })).rejects.toThrow();
    const plataforma = await e.admin.user.create({
      data: {
        name: "Pl",
        email: `pl-${randomUUID().slice(0, 8)}@prueba.opai.cl`,
        platformRole: "owner",
      },
    });
    await expect(auth.api.abrirSesionPin({ body: { userId: plataforma.id } })).rejects.toThrow();
  });
});
