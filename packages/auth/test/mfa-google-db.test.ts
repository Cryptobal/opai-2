import { randomUUID } from "node:crypto";

import { createOTP } from "@better-auth/utils/otp";
import { symmetricEncrypt } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

// El proveedor de Google se sustituye en su frontera HTTP/criptográfica; la resolución de cuenta,
// creación de sesión, hooks y TOTP son los reales de Better Auth contra Postgres.
describe.skipIf(!urlPropietario)("Google con MFA por sesión", () => {
  let e: Entorno;
  let auth: Auth;
  const email = `google-mfa-${randomUUID()}@prueba.opai.cl`;
  const secret = randomUUID();
  let userId: string;
  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    process.env["GOOGLE_CLIENT_ID"] = "proveedor-falso-de-test";
    process.env["GOOGLE_CLIENT_SECRET"] = "proveedor-falso-de-test";
    ({ auth } = await import("../src/auth"));
    const ctx = await auth.$context;
    const provider = ctx.socialProviders.find((p) => p.id === "google");
    if (!provider) throw new Error("Falta proveedor Google de prueba");
    provider.options = { ...provider.options, verifyIdToken: async () => true };
    vi.spyOn(provider, "getUserInfo").mockResolvedValue({
      user: { name: "Prueba", email, emailVerified: true },
      data: { sub: "google-prueba" },
    });
    const u = await e.admin.user.create({
      data: { name: "Prueba", email, emailVerified: true, twoFactorEnabled: true },
    });
    userId = u.id;
    await e.admin.account.create({
      data: { userId, providerId: "google", accountId: "google-prueba" },
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
  }, 120_000);
  afterAll(async () => {
    vi.restoreAllMocks();
    if (e) {
      await e.admin.user.deleteMany({ where: { email } });
      await e.cerrar();
    }
  });
  async function google() {
    const r = await auth.api.signInSocial({
      body: { provider: "google", idToken: { token: "token-falso" } },
      returnHeaders: true,
    });
    const cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const s = await auth.api.getSession({ headers: new Headers({ cookie }) });
    if (!s) throw new Error("Falta sesión social");
    return { cookie, s };
  }
  it("Google nace sin marca; un TOTP inválido no la concede, el válido solo marca ESA sesión", async () => {
    const a = await google();
    const b = await google();
    expect(a.s.session.mfaVerified).toBe(false);
    const codigo = await createOTP(secret, { digits: 6, period: 30 }).totp();
    await expect(
      auth.api.verifyTOTP({
        headers: new Headers({ cookie: a.cookie }),
        body: { code: codigo === "000000" ? "111111" : "000000" },
      }),
    ).rejects.toThrow();
    expect((await e.admin.session.findUnique({ where: { id: a.s.session.id } }))?.mfaVerified).toBe(
      false,
    );
    await auth.api.verifyTOTP({
      headers: new Headers({ cookie: a.cookie }),
      body: { code: codigo },
    });
    expect((await e.admin.session.findUnique({ where: { id: a.s.session.id } }))?.mfaVerified).toBe(
      true,
    );
    expect((await e.admin.session.findUnique({ where: { id: b.s.session.id } }))?.mfaVerified).toBe(
      false,
    );
  }, 30_000);
  it("Google permite completar con respaldo sin heredar marcas de sesiones anteriores", async () => {
    const { cookie, s } = await google();
    expect(s.session.mfaVerified).toBe(false);
    await auth.api.verifyBackupCode({
      headers: new Headers({ cookie }),
      body: { code: "respaldo-prueba" },
    });
    expect((await e.admin.session.findUnique({ where: { id: s.session.id } }))?.mfaVerified).toBe(
      true,
    );
  }, 30_000);
});
