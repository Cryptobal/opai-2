import { randomUUID } from "node:crypto";

import { symmetricEncrypt } from "better-auth/crypto";
import { vi } from "vitest";

import type { Entorno } from "../../db/test/entorno";

/** Cuenta ficticia con sesión social y MFA pendiente de verificar, solo para tests locales. */
export async function prepararMfaHttp(e: Entorno, email: string, secret: string) {
  process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
  process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
  process.env["GOOGLE_CLIENT_ID"] = "proveedor-falso-de-test";
  process.env["GOOGLE_CLIENT_SECRET"] = "proveedor-falso-de-test";
  const { auth } = await import("../src/auth");
  const ctx = await auth.$context;
  const provider = ctx.socialProviders.find((p) => p.id === "google")!;
  provider.options = { ...provider.options, verifyIdToken: async () => true };
  vi.spyOn(provider, "getUserInfo").mockResolvedValue({
    user: { name: "Prueba", email, emailVerified: true },
    data: { sub: email },
  });
  const u = await e.admin.user.create({
    data: { name: "Prueba", email, emailVerified: true, twoFactorEnabled: true },
  });
  const userId = u.id;
  await e.admin.account.create({ data: { userId, providerId: "google", accountId: email } });
  await e.admin.twoFactor.create({
    data: {
      userId,
      verified: true,
      secret: await symmetricEncrypt({ key: ctx.secretConfig, data: secret }),
      backupCodes: await symmetricEncrypt({
        key: ctx.secretConfig,
        data: JSON.stringify(["respaldo-http"]),
      }),
    },
  });
  return { auth, userId };
}
