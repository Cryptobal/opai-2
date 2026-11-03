// CAR-152 · D1: `session.cookieCache` 60 s reduce lecturas de sesión en Neon; operaciones sensibles de
// Better Auth siguen leyendo la base. Solo `pnpm test:db` (Postgres real).
import { randomUUID } from "node:crypto";

import { createOTP } from "@better-auth/utils/otp";
import { symmetricEncrypt } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

describe.skipIf(!urlPropietario)("session.cookieCache 60 s (CAR-152)", () => {
  let e: Entorno;
  let auth: Auth;
  let userId = "";
  const email = `sesion-cache-${randomUUID()}@prueba.opai.cl`;
  const secret = randomUUID();

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    process.env["GOOGLE_CLIENT_ID"] = "proveedor-falso-de-test";
    process.env["GOOGLE_CLIENT_SECRET"] = "proveedor-falso-de-test";
    ({ auth } = await import("../src/auth"));
    const ctx = await auth.$context;
    const provider = ctx.socialProviders.find((p) => p.id === "google")!;
    provider.options = { ...provider.options, verifyIdToken: async () => true };
    vi.spyOn(provider, "getUserInfo").mockResolvedValue({
      user: { name: "Prueba", email, emailVerified: true },
      data: { sub: email },
    });
    const u = await e.admin.user.create({
      data: { name: "Prueba", email, emailVerified: true, twoFactorEnabled: false },
    });
    userId = u.id;
    await e.admin.account.create({ data: { userId, providerId: "google", accountId: email } });
  }, 120_000);

  afterAll(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (!e) return;
    await e.admin.user.deleteMany({ where: { email } });
    await e.cerrar();
  });

  async function entrar(): Promise<Headers> {
    const r = await auth.api.signInSocial({
      body: { provider: "google", idToken: { token: "token-falso" } },
      returnHeaders: true,
    });
    const cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    return new Headers({ cookie });
  }

  /** Lo que haría el navegador: aplica los `Set-Cookie` de una respuesta sobre la jarra de cookies. */
  function aplicar(headers: Headers, respuesta: Headers): Headers {
    const jarra = new Map(
      (headers.get("cookie") ?? "")
        .split("; ")
        .filter(Boolean)
        .map((c) => [c.split("=")[0]!, c] as const),
    );
    for (const sc of respuesta.getSetCookie()) {
      const [par = "", ...attrs] = sc.split("; ");
      const nombre = par.split("=")[0]!;
      const vacia = par.endsWith("=") || attrs.some((a) => /^max-age=0$/i.test(a));
      if (vacia) jarra.delete(nombre);
      else jarra.set(nombre, par);
    }
    return new Headers({ cookie: [...jarra.values()].join("; ") });
  }

  it("fija cookieCache habilitada con maxAge 60 s", () => {
    expect(auth.options.session?.cookieCache).toEqual({ enabled: true, maxAge: 60 });
  });

  it("getSession devuelve la sesión tras el ingreso", async () => {
    const headers = await entrar();
    const sesion = await auth.api.getSession({ headers });
    expect(sesion?.user.id).toBe(userId);
    expect(sesion?.session.userId).toBe(userId);
  });

  it("pasados 61 s desde la caché, una sesión borrada en la base ya no autentica", async () => {
    vi.useFakeTimers();
    const headers = await entrar();
    expect((await auth.api.getSession({ headers }))?.user.id).toBe(userId);
    await e.admin.session.deleteMany({ where: { userId } });
    expect((await auth.api.getSession({ headers }))?.user.id).toBe(userId);
    vi.advanceTimersByTime(61_000);
    expect(await auth.api.getSession({ headers })).toBeNull();
    vi.useRealTimers();
    await e.admin.session.deleteMany({ where: { userId } });
  });

  it("sign-out invalida de inmediato la sesión del navegador que la cierra", async () => {
    vi.useFakeTimers();
    const headers = await entrar();
    expect((await auth.api.getSession({ headers }))?.user.id).toBe(userId);
    const r = await auth.api.signOut({ headers, returnHeaders: true });
    // Los `Set-Cookie` de la respuesta borran token y caché: el navegador queda sin sesión...
    expect(await auth.api.getSession({ headers: aplicar(headers, r.headers) })).toBeNull();
    // ...y la fila de la base ya no existe.
    expect(await e.admin.session.count({ where: { userId } })).toBe(0);
    vi.useRealTimers();
  });

  it("riesgo aceptado (D1): una cookie copiada antes del sign-out autentica hasta el maxAge", async () => {
    vi.useFakeTimers();
    const copia = await entrar();
    await auth.api.signOut({ headers: copia });
    expect((await auth.api.getSession({ headers: copia }))?.user.id).toBe(userId);
    vi.advanceTimersByTime(61_000);
    expect(await auth.api.getSession({ headers: copia })).toBeNull();
    vi.useRealTimers();
  });

  it("MFA verificado se refleja en getSession sin esperar el maxAge de la caché", async () => {
    const ctx = await auth.$context;
    await e.admin.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    await e.admin.twoFactor.create({
      data: {
        userId,
        verified: true,
        secret: await symmetricEncrypt({ key: ctx.secretConfig, data: secret }),
        backupCodes: await symmetricEncrypt({
          key: ctx.secretConfig,
          data: JSON.stringify(["respaldo-prueba"]),
        }),
      },
    });
    const headers = await entrar();
    expect((await auth.api.getSession({ headers }))?.session.mfaVerified).toBe(false);
    const codigo = await createOTP(secret, { digits: 6, period: 30 }).totp();
    const r = await auth.api.verifyTOTP({
      body: { code: codigo },
      headers,
      returnHeaders: true,
    });
    // El navegador aplica los `Set-Cookie` de la verificación (expiran la caché con `false`).
    const despues = aplicar(headers, r.headers);
    expect((await auth.api.getSession({ headers: despues }))?.session.mfaVerified).toBe(true);
    await e.admin.twoFactor.deleteMany({ where: { userId } });
    await e.admin.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    await e.admin.session.deleteMany({ where: { userId } });
  });

  it("pasado el maxAge de la caché, los cambios de usuario en la base se reflejan en getSession", async () => {
    vi.useFakeTimers();
    const headers = await entrar();
    expect((await auth.api.getSession({ headers }))?.user.name).toBe("Prueba");
    await e.admin.user.update({ where: { id: userId }, data: { name: "Actualizado" } });
    expect((await auth.api.getSession({ headers }))?.user.name).toBe("Prueba");
    vi.advanceTimersByTime(61_000);
    expect((await auth.api.getSession({ headers }))?.user.name).toBe("Actualizado");
    vi.useRealTimers();
    await e.admin.user.update({ where: { id: userId }, data: { name: "Prueba" } });
    await e.admin.session.deleteMany({ where: { userId } });
  });
});
