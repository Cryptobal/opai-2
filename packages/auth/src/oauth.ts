import { oauthProvider } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";

import { clienteAuth, forUser } from "@opai/db";

import {
  ALCANCES_OAUTH,
  empresaDelConsentimiento,
  type MembresiaOAuth,
  necesitaElegirEmpresa,
  VIDA_ACCESO_SEGUNDOS,
  VIDA_REFRESH_SEGUNDOS,
} from "./oauth-reglas";

/** Pantalla donde la persona elige la empresa con la que conecta la app (export-acceso 05). */
export const PAGINA_EMPRESA_OAUTH = "/elegir-empresa?oauth=1";
/** Pantalla de consentimiento: qué app, qué empresa y qué podrá hacer. */
export const PAGINA_CONSENTIMIENTO_OAUTH = "/autorizar";

/** URL del recurso protegido (el MCP), según `BETTER_AUTH_URL`. */
export const recursoMcp = (base = process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000") =>
  new URL("/api/mcp", base).toString();

async function membresiasOAuth(userId: string): Promise<MembresiaOAuth[]> {
  const filas = await forUser(userId).membership.findMany({
    select: { tenantId: true, estado: true, tenant: { select: { estado: true } } },
  });
  return filas.map((m) => ({
    tenantId: m.tenantId,
    estado: m.estado,
    tenantEstado: m.tenant.estado,
  }));
}

/**
 * Empresa elegida en esta sesión para autorizar apps. Se lee de la base: la lectura rápida de la sesión
 * (`core.auth_sesion_por_token`) no trae esta columna.
 */
async function empresaDeSesion(session: { id: string }): Promise<string | null> {
  const fila = await clienteAuth().session.findUnique({
    where: { id: session.id },
    select: { oauthTenantId: true },
  });
  return fila?.oauthTenantId ?? null;
}

/**
 * Proveedor OAuth del MCP (CAR-247, ADR-098). Apps como Claude se registran solas (DCR), piden entrar
 * con la cuenta de la persona, que elige empresa y autoriza; reciben tokens opacos de 1 hora (refresh
 * de 30 días con rotación) atados a esa empresa por `reference_id`. Solo código con PKCE y refresh;
 * nunca `platform`. Los tokens se guardan con hash y el MCP los valida contra la base.
 */
export const proveedorOAuth = () =>
  oauthProvider({
    loginPage: "/login",
    consentPage: PAGINA_CONSENTIMIENTO_OAUTH,
    scopes: [...ALCANCES_OAUTH],
    disableJwtPlugin: true,
    storeTokens: "hashed",
    accessTokenExpiresIn: VIDA_ACCESO_SEGUNDOS,
    refreshTokenExpiresIn: VIDA_REFRESH_SEGUNDOS,
    grantTypes: ["authorization_code", "refresh_token"],
    allowDynamicClientRegistration: true,
    allowUnauthenticatedClientRegistration: true,
    clientRegistrationRequirePKCE: true,
    clientRegistrationDefaultScopes: [...ALCANCES_OAUTH],
    clientRegistrationAllowedScopes: [...ALCANCES_OAUTH],
    resources: [{ identifier: recursoMcp(), name: "OPAI 2.0 · MCP" }],
    postLogin: {
      page: PAGINA_EMPRESA_OAUTH,
      shouldRedirect: async ({ user, session }) =>
        necesitaElegirEmpresa(await membresiasOAuth(user.id), await empresaDeSesion(session)),
      consentReferenceId: async ({ user, session }) => {
        try {
          return empresaDelConsentimiento(
            await membresiasOAuth(user.id),
            await empresaDeSesion(session),
          );
        } catch {
          throw new APIError("FORBIDDEN", {
            message: "Elige una empresa válida para conectar la app.",
          });
        }
      },
    },
  });
