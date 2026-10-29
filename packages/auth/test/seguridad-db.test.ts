// CAR-42 (auditoría del Núcleo I-03): login, contraseña y MFA dejan su hecho en el registro de
// seguridad global (`core.auditoria_global`, ámbito `seguridad`), con Better Auth y Postgres reales.
import { randomUUID } from "node:crypto";

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

const PASSWORD = `Prueba-${randomUUID()}`;

describe.skipIf(!urlPropietario)("registro de seguridad global (CAR-42)", () => {
  let e: Entorno;
  let auth: Auth;
  const correos: string[] = [];

  async function crearUsuario(): Promise<{ email: string; id: string }> {
    const email = `seguridad-${randomUUID().slice(0, 8)}@prueba.opai.cl`;
    correos.push(email);
    const ctx = await auth.$context;
    const user = await e.admin.user.create({ data: { name: "Prueba", email } });
    await e.admin.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: await ctx.password.hash(PASSWORD),
      },
    });
    return { email, id: user.id };
  }

  const hechosDe = (actorId: string, capability: string) =>
    e.admin.auditoriaGlobal.findMany({ where: { ambito: "seguridad", actorId, capability } });

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    ({ auth } = await import("../src/auth"));
  }, 120_000);

  afterAll(async () => {
    if (e) {
      // `core.auditoria_global` es append-only y encadenada (CAR-36/CAR-42): nunca se borra, ni en
      // los tests (un DELETE deja un hueco de `seq` y rompe la cadena para OTRAS pruebas que la
      // verifican de punta a punta, p. ej. plataforma-aislamiento-db.test.ts). Solo se limpian los
      // usuarios de prueba.
      await e.admin.user.deleteMany({ where: { email: { in: correos } } });
      await e.cerrar();
    }
  });

  it("un login correcto deja «seguridad.login» con el id del usuario", async () => {
    const { email, id } = await crearUsuario();
    await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers({ "x-forwarded-for": "203.0.113.70" }),
    });
    const hechos = await hechosDe(id, "seguridad.login");
    expect(hechos).toHaveLength(1);
    expect(hechos[0]).toMatchObject({ actorType: "user", ipCifrada: expect.any(String) });
    expect(hechos[0]?.ipCifrada).not.toContain("203.0.113.70");
  });

  it("un login con contraseña mala deja «seguridad.login_fallo» sin actorId (sin oráculo)", async () => {
    const { email } = await crearUsuario();
    await auth.api
      .signInEmail({ body: { email, password: "mala-clave" }, headers: new Headers() })
      .catch(() => undefined);
    const hechos = await e.admin.auditoriaGlobal.findMany({
      where: { ambito: "seguridad", capability: "seguridad.login_fallo" },
      orderBy: { seq: "desc" },
      take: 1,
    });
    expect(hechos[0]).toMatchObject({ actorId: null });
  });

  it("cambiar la contraseña en sesión deja «seguridad.password_cambio»", async () => {
    const { email, id } = await crearUsuario();
    const r = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers(),
      returnHeaders: true,
    });
    const cookie = r.headers.getSetCookie()[0]?.split(";")[0] ?? "";
    await auth.api.changePassword({
      body: { currentPassword: PASSWORD, newPassword: `${PASSWORD}-2`, revokeOtherSessions: false },
      headers: new Headers({ cookie }),
    });
    const hechos = await hechosDe(id, "seguridad.password_cambio");
    expect(hechos).toHaveLength(1);
  });

  it("desactivar el segundo factor deja «seguridad.mfa_desactivar»", async () => {
    const { email, id } = await crearUsuario();
    const r = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers(),
      returnHeaders: true,
    });
    const cookie = r.headers.getSetCookie()[0]?.split(";")[0] ?? "";
    await auth.api.enableTwoFactor({ body: { password: PASSWORD }, headers: new Headers({ cookie }) });
    await auth.api.disableTwoFactor({ body: { password: PASSWORD }, headers: new Headers({ cookie }) });
    const hechos = await hechosDe(id, "seguridad.mfa_desactivar");
    expect(hechos).toHaveLength(1);
  });

  /** Fusiona las cookies previas con las que fija una respuesta (Set-Cookie), como mfa-db.test.ts. */
  function fusionar(previo: string, headers: Headers): string {
    const mapa = new Map<string, string>();
    for (const p of previo.split(";")) {
      const t = p.trim();
      const i = t.indexOf("=");
      if (i > 0) mapa.set(t.slice(0, i), t.slice(i + 1));
    }
    for (const sc of headers.getSetCookie()) {
      const first = sc.split(";")[0] ?? "";
      const i = first.indexOf("=");
      if (i > 0) mapa.set(first.slice(0, i), first.slice(i + 1));
    }
    return [...mapa].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  it("regenerar los códigos de respaldo deja «seguridad.mfa_codigos_regenerar» (CAR-54)", async () => {
    const { email, id } = await crearUsuario();
    const r1 = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers(),
      returnHeaders: true,
    });
    let cookie = fusionar("", r1.headers);
    const alta = await auth.api.enableTwoFactor({
      body: { password: PASSWORD },
      headers: new Headers({ cookie }),
      returnHeaders: true,
    });
    cookie = fusionar(cookie, alta.headers);
    const r = alta.response;
    if (r.method !== "totp") throw new Error("se esperaba totp");
    const secretoBase32 = new URL(r.totpURI).searchParams.get("secret") ?? "";
    const secreto = new TextDecoder().decode(base32.decode(secretoBase32));
    const codigo = await createOTP(secreto, { digits: 6, period: 30 }).totp();
    const verificado = await auth.api.verifyTOTP({
      body: { code: codigo },
      headers: new Headers({ cookie }),
      returnHeaders: true,
    });
    cookie = fusionar(cookie, verificado.headers);
    await auth.api.generateBackupCodes({
      body: { password: PASSWORD },
      headers: new Headers({ cookie }),
    });
    const hechos = await hechosDe(id, "seguridad.mfa_codigos_regenerar");
    expect(hechos).toHaveLength(1);
  });
});
