import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

type CamposPropios = { twoFactorEnabled?: boolean | null; platformRole?: string | null };

/**
 * Abre la sesión de un usuario ya verificado con RUT + PIN (`pin.ts`). El endpoint es SOLO SERVIDOR
 * (`metadata.SERVER_ONLY`): no existe en el router HTTP de `/api/auth`, solo `auth.api.abrirSesionPin`.
 * Rechaza a quien tenga segundo factor activo o rol de plataforma: el PIN nunca los reemplaza. La
 * sesión pasa por los hooks normales (`databaseHooks.session.create`: empresa suspendida, MFA sin
 * verificar), que corren al crearla.
 */
export const sesionPin = {
  id: "opai-sesion-pin",
  endpoints: {
    abrirSesionPin: createAuthEndpoint(
      "/opai/sesion-pin",
      { method: "POST", body: z.object({ userId: z.string() }), metadata: { SERVER_ONLY: true } },
      async (ctx) => {
        const base = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
        // Los campos propios del esquema (`twoFactorEnabled`, `platformRole`) llegan de la fila de la base.
        const usuario = base && (base as typeof base & CamposPropios);
        if (!usuario || usuario.twoFactorEnabled || usuario.platformRole) {
          throw new APIError("FORBIDDEN", { message: "Credenciales inválidas." });
        }
        const sesion = await ctx.context.internalAdapter.createSession(usuario.id);
        await setSessionCookie(ctx, { session: sesion, user: usuario });
        return ctx.json({ ok: true });
      },
    ),
  },
} satisfies BetterAuthPlugin;
