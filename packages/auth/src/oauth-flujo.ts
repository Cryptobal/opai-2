import { headers } from "next/headers";

import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";

import { clienteAuth } from "@opai/db";

import { auth } from "./auth";
import { empresaDeSesion, membresiasOAuth } from "./oauth";
import { consultaParaAutorizar, empresaDelConsentimiento } from "./oauth-reglas";

/**
 * Pasos del OAuth del MCP que la persona hace en pantalla (CAR-247): reanudar tras entrar, elegir
 * empresa y autorizar. Todo por `auth.api.*` en Server Actions; la consulta firmada por el proveedor
 * se verifica siempre antes de usarla (firma y vencimiento de 10 minutos).
 */
export type PasoOAuth = { ok: true; url: string } | { ok: false; motivo: "vencido" | "empresa" };

export async function consultaOAuthValida(consulta: string): Promise<boolean> {
  if (!consulta.includes("sig=")) return false;
  const { secret } = await auth.$context;
  return verifyOAuthQueryParams(consulta, secret);
}

/** URL interna que reanuda la autorización con la sesión ya abierta, o null si la consulta venció. */
export async function urlReanudarOAuth(consulta: string): Promise<string | null> {
  if (!(await consultaOAuthValida(consulta))) return null;
  return `/api/auth/oauth2/authorize?${consultaParaAutorizar(consulta)}`;
}

const urlDe = (r: { url?: string } | null | undefined): PasoOAuth =>
  r?.url ? { ok: true, url: r.url } : { ok: false, motivo: "vencido" };

/** Fija la empresa de la sesión para esta autorización y sigue el flujo del proveedor. */
export async function elegirEmpresaOAuth(tenantId: string, consulta: string): Promise<PasoOAuth> {
  if (!(await consultaOAuthValida(consulta))) return { ok: false, motivo: "vencido" };
  const h = await headers();
  const sesion = await auth.api.getSession({ headers: h });
  if (!sesion) return { ok: false, motivo: "vencido" };
  try {
    empresaDelConsentimiento(await membresiasOAuth(sesion.user.id), tenantId);
  } catch {
    return { ok: false, motivo: "empresa" };
  }
  await clienteAuth().session.update({
    where: { id: sesion.session.id },
    data: { oauthTenantId: tenantId },
  });
  try {
    return urlDe(
      await auth.api.oauth2Continue({
        body: { postLogin: true, oauth_query: consulta },
        headers: h,
      }),
    );
  } catch (e) {
    if (e instanceof APIError) return { ok: false, motivo: "vencido" };
    throw e;
  }
}

/** Acepta o rechaza la autorización; devuelve a dónde volver (la app o su aviso de rechazo). */
export async function consentirOAuth(aceptar: boolean, consulta: string): Promise<PasoOAuth> {
  if (!(await consultaOAuthValida(consulta))) return { ok: false, motivo: "vencido" };
  const h = await headers();
  try {
    return urlDe(
      await auth.api.oauth2Consent({
        body: { accept: aceptar, oauth_query: consulta },
        headers: h,
      }),
    );
  } catch (e) {
    if (e instanceof APIError) return { ok: false, motivo: "vencido" };
    throw e;
  } finally {
    // La empresa elegida vale para esta app: la siguiente vuelve a preguntar.
    const sesion = await auth.api.getSession({ headers: h });
    if (sesion)
      await clienteAuth().session.update({
        where: { id: sesion.session.id },
        data: { oauthTenantId: null },
      });
  }
}

export type DatosConsentimiento = {
  app: { nombre: string; sitio: string | null };
  alcances: string[];
  empresaId: string | null;
};

/** Lo que muestra la pantalla de autorizar: qué app, qué pide y para qué empresa. */
export async function datosConsentimientoOAuth(
  consulta: string,
): Promise<DatosConsentimiento | null> {
  if (!(await consultaOAuthValida(consulta))) return null;
  const p = new URLSearchParams(consulta);
  const h = await headers();
  const sesion = await auth.api.getSession({ headers: h });
  if (!sesion) return null;
  try {
    const app = await auth.api.getOAuthClientPublic({
      query: { client_id: p.get("client_id") ?? "" },
      headers: h,
    });
    let empresaId: string | null = null;
    try {
      empresaId = empresaDelConsentimiento(
        await membresiasOAuth(sesion.user.id),
        await empresaDeSesion(sesion.session),
      );
    } catch {
      empresaId = null;
    }
    return {
      app: { nombre: app.client_name ?? "Una app", sitio: app.client_uri ?? null },
      alcances: (p.get("scope") ?? "").split(" ").filter(Boolean),
      empresaId,
    };
  } catch (e) {
    if (e instanceof APIError) return null;
    throw e;
  }
}
