import { APIError, createAuthMiddleware } from "better-auth/api";

import {
  CLAVE_INTENTO,
  datosDeContexto,
  intentoDeContexto,
  MENSAJE_PAUSA,
  reservarIntento,
  resolverIntento,
} from "./bloqueo-login";
import { auditarSeguridad } from "./seguridad";

/** Id del usuario en la respuesta de un endpoint de Better Auth (login o cambio de contraseña). */
function usuarioDevuelto(r: unknown): string | null {
  if (!r || typeof r !== "object") return null;
  const id = (r as { user?: { id?: unknown } }).user?.id;
  return typeof id === "string" ? id : null;
}

/**
 * Bloqueo de login persistido por cuenta (B1, Brief 07c) y registro de seguridad global (CAR-42).
 * Se engancha en `sign-in/email` y `change-password` sobre la capa de Better Auth, no solo en la
 * Server Action, para que cubra también el POST directo a `/api/auth/...` y no sea evitable
 * saltándose la UI. El límite en memoria de la librería y el de `apps/web/lib/rate-limit.ts` siguen
 * como primera barrera barata.
 */
export const hooksLogin = {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/sign-in/email") return;
    const datos = datosDeContexto(ctx);
    if (!datos) return;
    // Cuenta e inserta el provisional bajo el advisory lock; si ya superó el límite, o el lock lo
    // tiene otro intento del mismo correo, responde 429 sin esperar (mismo cuerpo en ambos casos).
    // Al lanzar aquí, Better Auth no corre el `after`, así que no deja un provisional colgado.
    const reserva = await reservarIntento(datos);
    if (reserva.estado !== "ok") {
      throw new APIError("TOO_MANY_REQUESTS", { code: "ACCOUNT_LOCKED", message: MENSAJE_PAUSA });
    }
    // El id del provisional viaja al `after` en el contexto de la petición (no por correo e IP).
    return { context: { context: { [CLAVE_INTENTO]: reserva.intentoId } } };
  }),
  after: createAuthMiddleware(async (ctx) => {
    if (ctx.path === "/change-password") {
      // CAR-42: contraseña cambiada en sesión (packages/auth/src/acciones.ts:cambiarPassword).
      const r = ctx.context.returned;
      if (r instanceof APIError) return;
      const id = usuarioDevuelto(r);
      if (id) await auditarSeguridad("seguridad.password_cambio", id, ctx.headers ?? new Headers());
      return;
    }
    if (ctx.path !== "/sign-in/email") return;
    const intentoId = intentoDeContexto(ctx.context);
    if (!intentoId) return;
    const r = ctx.context.returned;
    const codigo =
      r instanceof APIError ? ((r.body as { code?: string } | undefined)?.code ?? "ERROR") : null;
    try {
      await resolverIntento(intentoId, codigo);
    } catch (e) {
      // Resolver el provisional es best-effort: un fallo al marcarlo no debe romper el login ni
      // filtrar datos (sin imprimir valores, Ley 21.719); el provisional caduca con la ventana.
      console.warn("[bloqueo-login] no se pudo resolver el intento de login", {
        error: e instanceof Error ? e.name : typeof e,
      });
    }
    // CAR-42: registro de seguridad global (append-only, sin tenant), con IP en HMAC y user agent.
    // Sin `codigo` (login correcto) se audita con el usuario devuelto; un fallo nunca busca el
    // correo (sería un oráculo de qué cuentas existen).
    const capability =
      codigo === null
        ? "seguridad.login"
        : codigo === "ACCOUNT_SUSPENDED" || codigo === "ACCOUNT_LOCKED"
          ? "seguridad.login_bloqueado"
          : "seguridad.login_fallo";
    const actorId = codigo === null ? usuarioDevuelto(r) : null;
    await auditarSeguridad(capability, actorId, ctx.headers ?? new Headers());
  }),
};
