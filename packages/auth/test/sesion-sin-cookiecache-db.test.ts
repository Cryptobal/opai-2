// B1 · causa raíz: getSession de Better Auth valida la sesión por la función SECURITY DEFINER
// (fuera de transacción) y NO cachea la sesión entre peticiones: una sesión revocada deja de valer
// en la petición siguiente (sin session.cookieCache). Solo `pnpm test:db` (Postgres real).
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

describe.skipIf(!urlPropietario)("getSession por función y sin caché de sesión (B1)", () => {
  let e: Entorno;
  let auth: Auth;
  let userId = "";
  const email = `sesion-b1-${randomUUID()}@prueba.opai.cl`;

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

  it("no activa session.cookieCache (la sesión se valida contra la base en cada petición)", () => {
    const session = auth.options.session as Record<string, unknown> | undefined;
    // cookieCache es opt-in en Better Auth: sin configurarlo, la sesión se lee de la base siempre.
    expect(session?.["cookieCache"]).toBeUndefined();
  });

  it("getSession devuelve la sesión y el usuario leídos por la función", async () => {
    const headers = await entrar();
    const sesion = await auth.api.getSession({ headers });
    expect(sesion?.user.id).toBe(userId);
    expect(sesion?.user.email).toBe(email);
    expect(sesion?.session.userId).toBe(userId);
  });

  it("tras revocar la sesión, la petición siguiente ya no autentica (sin cookieCache)", async () => {
    const headers = await entrar();
    expect((await auth.api.getSession({ headers }))?.user.id).toBe(userId);
    await e.admin.session.deleteMany({ where: { userId } });
    expect(await auth.api.getSession({ headers })).toBeNull();
  });
});
