import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";

import { clienteAuth } from "@opai/db";

/** Se ejecuta también en los endpoints HTTP directos, no solo en las Server Actions. */
export const marcaMfaSesion = {
  id: "opai-mfa-sesion",
  hooks: {
    before: [
      {
        matcher: (ctx) =>
          [
            "/two-factor/enable",
            "/two-factor/disable",
            "/two-factor/generate-backup-codes",
            "/two-factor/view-backup-codes",
          ].includes(ctx.path ?? ""),
        handler: createAuthMiddleware(async (ctx) => {
          const s = await getSessionFromCtx(ctx);
          if (!s?.user.twoFactorEnabled) return;
          const sesion = await clienteAuth().session.findUnique({
            where: { token: s.session.token },
          });
          if (!sesion?.mfaVerified)
            throw new APIError("FORBIDDEN", { message: "Completa el segundo factor." });
        }),
      },
    ],
    after: [
      {
        matcher: (ctx) =>
          ["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(ctx.path ?? ""),
        handler: createAuthMiddleware(async (ctx) => {
          const r = ctx.context.returned;
          if (r instanceof APIError || !r || typeof r !== "object" || !Reflect.get(r, "token"))
            return;
          const actual = ctx.context.newSession ?? ctx.context.session;
          if (!actual) return;
          // Una sola escritura condicionada al usuario y token verificados por Better Auth. No marca
          // otras sesiones del mismo usuario (incluidas las de Google que sigan pendientes).
          await clienteAuth().session.updateMany({
            where: {
              token: actual.session.token,
              userId: actual.user.id,
              user: { twoFactorEnabled: true },
            },
            data: { mfaVerified: true },
          });
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
