// NÚCLEO-F: flujo real del segundo factor con Better Auth y Postgres. Enrola (habilita + verifica el
// TOTP en sesión), comprueba que la cuenta queda con `two_factor_enabled`, y que el paso de verificar
// el código en el login tiene bloqueo POR CUENTA a través de desafíos (accountLockout del plugin,
// alineado con el bloqueo de login). El código TOTP se genera en la prueba desde el secreto del QR.
import { randomUUID } from "node:crypto";

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Auth } from "../src/auth";
import { MFA_LIMITE_INTENTOS } from "../src/opciones";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

const PASSWORD = `Prueba-${randomUUID()}`;

/** Secreto TOTP crudo a partir del `otpauth://` (el parámetro `secret` viaja en base32). */
function secretoCrudo(totpURI: string): string {
  const base32Secret = new URL(totpURI).searchParams.get("secret") ?? "";
  return new TextDecoder().decode(base32.decode(base32Secret));
}

const codigoDe = (secret: string) => createOTP(secret, { digits: 6, period: 30 }).totp();

/** Fusiona las cookies previas con las que fija una respuesta (Set-Cookie), para la siguiente llamada. */
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

const cab = (cookie: string) => new Headers(cookie ? { cookie } : {});

describe.skipIf(!urlPropietario)("segundo factor con Better Auth real (NÚCLEO-F)", () => {
  let e: Entorno;
  let auth: Auth;
  const correos: string[] = [];

  async function crearUsuario(): Promise<string> {
    const email = `mfa-${randomUUID().slice(0, 8)}@prueba.opai.cl`;
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
    return email;
  }

  /** Enrola el segundo factor (en sesión) y devuelve el secreto TOTP para generar códigos. */
  async function enrolar(email: string): Promise<string> {
    const r1 = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: cab(""),
      returnHeaders: true,
    });
    let cookie = fusionar("", r1.headers);
    const alta = await auth.api.enableTwoFactor({
      body: { password: PASSWORD },
      headers: cab(cookie),
      returnHeaders: true,
    });
    cookie = fusionar(cookie, alta.headers);
    const r = alta.response;
    if (r.method !== "totp") throw new Error("se esperaba totp");
    const secret = secretoCrudo(r.totpURI);
    const codigo = await codigoDe(secret);
    await auth.api.verifyTOTP({ body: { code: codigo }, headers: cab(cookie), returnHeaders: true });
    return secret;
  }

  const verificarLogin = (code: string, cookie: string) =>
    auth.api
      .verifyTOTP({ body: { code }, headers: cab(cookie), returnHeaders: true })
      .then(() => ({ status: 200, codigo: "OK" }))
      .catch((err: unknown) => ({
        status: Number(Reflect.get(err as object, "statusCode")),
        codigo: String((Reflect.get(err as object, "body") as { code?: string })?.code),
      }));

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    ({ auth } = await import("../src/auth"));
  }, 120_000);

  afterAll(async () => {
    if (e) {
      await e.admin.user.deleteMany({ where: { email: { in: correos } } });
      await e.cerrar();
    }
  });

  it("enrolar deja la cuenta con el segundo factor activo", async () => {
    const email = await crearUsuario();
    await enrolar(email);
    const u = await e.admin.user.findUnique({ where: { email } });
    expect(u?.twoFactorEnabled).toBe(true);
  });

  it("el login con el segundo factor activo pide verificar el código (no crea sesión aún)", async () => {
    const email = await crearUsuario();
    await enrolar(email);
    const { response } = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: cab(""),
      returnHeaders: true,
    });
    expect(Reflect.get(response as object, "twoFactorRedirect")).toBe(true);
  });

  it("verificar el código tiene bloqueo por cuenta: tras varios fallos, un desafío nuevo queda pausado", async () => {
    const email = await crearUsuario();
    const secret = await enrolar(email);
    const valido = await codigoDe(secret);
    const malo = valido === "000000" ? "111111" : "000000";
    // Desafío 1: agota los intentos por cuenta con códigos incorrectos.
    const r1 = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: cab(""),
      returnHeaders: true,
    });
    const cookie1 = fusionar("", r1.headers);
    for (let i = 0; i < MFA_LIMITE_INTENTOS; i++) {
      expect((await verificarLogin(malo, cookie1)).status).toBe(401);
    }
    // Desafío 2 (cookie nueva): la cuenta está bloqueada, ni siquiera un código válido entra.
    const r2 = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: cab(""),
      returnHeaders: true,
    });
    const cookie2 = fusionar("", r2.headers);
    const bloqueo = await verificarLogin(valido, cookie2);
    expect(bloqueo.status).toBe(429);
    expect(bloqueo.codigo).toBe("ACCOUNT_TEMPORARILY_LOCKED");
  });
});
