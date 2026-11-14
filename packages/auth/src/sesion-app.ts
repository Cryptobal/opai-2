import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, getSessionFromCtx } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

import {
  claveCodigoApp,
  esRetoValido,
  leerValorCanje,
  nuevoCodigoApp,
  verificadorCorresponde,
  VIDA_CODIGO_APP_SEGUNDOS,
} from "./canje-app";
import { segundoFactorPendiente } from "./mfa-sesion";

const reto = z.string().refine(esRetoValido);
const INVALIDO = "No pudimos completar el ingreso.";

/**
 * Ingreso con Google desde la app nativa (CAR-516, Brief 17b). Ambos endpoints son SOLO SERVIDOR: no
 * existen en el router HTTP de `/api/auth`.
 * - `emitirCodigoApp`: en el navegador del sistema, con la sesión recién abierta y el segundo factor
 *   completo, guarda un código de un solo uso (2 min) atado al reto PKCE de la app.
 * - `canjearCodigoApp`: en la app, consume el código (atómico) y, si el verificador corresponde al
 *   reto, abre una sesión nueva. Nace con `mfaVerified = false` (hook de creación): no se hereda.
 */
export const sesionApp = {
  id: "opai-sesion-app",
  endpoints: {
    emitirCodigoApp: createAuthEndpoint(
      "/opai/app/emitir",
      { method: "POST", body: z.object({ reto }), metadata: { SERVER_ONLY: true } },
      async (ctx) => {
        const actual = await getSessionFromCtx(ctx);
        if (!actual?.session || (await segundoFactorPendiente(actual.session.token))) {
          throw new APIError("FORBIDDEN", { message: INVALIDO });
        }
        const codigo = nuevoCodigoApp();
        await ctx.context.internalAdapter.createVerificationValue({
          identifier: claveCodigoApp(codigo),
          value: JSON.stringify({ userId: actual.user.id, reto: ctx.body.reto }),
          expiresAt: new Date(Date.now() + VIDA_CODIGO_APP_SEGUNDOS * 1000),
        });
        return ctx.json({ codigo });
      },
    ),
    canjearCodigoApp: createAuthEndpoint(
      "/opai/app/canjear",
      {
        method: "POST",
        body: z.object({ codigo: reto, verificador: reto }),
        metadata: { SERVER_ONLY: true },
      },
      async (ctx) => {
        // Se consume antes de verificar: un código queda inútil al primer intento, acierte o no.
        const fila = await ctx.context.internalAdapter.consumeVerificationValue(
          claveCodigoApp(ctx.body.codigo),
        );
        const datos = fila ? leerValorCanje(fila.value) : null;
        if (!datos || !verificadorCorresponde(ctx.body.verificador, datos.reto)) {
          throw new APIError("FORBIDDEN", { message: INVALIDO });
        }
        const usuario = await ctx.context.internalAdapter.findUserById(datos.userId);
        if (!usuario) throw new APIError("FORBIDDEN", { message: INVALIDO });
        const sesion = await ctx.context.internalAdapter.createSession(usuario.id);
        await setSessionCookie(ctx, { session: sesion, user: usuario });
        return ctx.json({ ok: true });
      },
    ),
  },
} satisfies BetterAuthPlugin;
