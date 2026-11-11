import { headers } from "next/headers";

import {
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { APIError } from "better-auth/api";

import { clienteAuth, PREFIJO_REAUTENTICACION } from "@opai/db";

import { auth } from "./auth";
import { relyingParty } from "./opciones";
import { respuestaEntradaWebAuthn } from "./passkey-respuesta";

/**
 * Confirmar la identidad antes de quitar un método de acceso (CAR-286): con la contraseña, un código
 * de la app autenticadora o una passkey vigente. Si se confirma, deja una marca de un solo uso por
 * 5 minutos en `core.verifications` que consume `core.metodos_acceso.quitar` en la transacción del
 * cambio. La passkey se verifica aquí (sin crear sesión) con el mismo RP que el plugin.
 */
const VIGENCIA_MS = 5 * 60 * 1000;
const RETO = "opai-reauth-reto:";

export type Confirmacion =
  | { tipo: "password"; valor: string }
  | { tipo: "codigo"; valor: string }
  | { tipo: "passkey"; respuesta: unknown };

async function usuarioActual(h: Headers): Promise<string | null> {
  const s = await auth.api.getSession({ headers: h, query: { disableCookieCache: true } });
  return s?.user.id ?? null;
}

function rp(h: Headers) {
  const r = relyingParty(process.env);
  return {
    rpID: r.rpID ?? "localhost",
    origin: r.origin ?? h.get("origin") ?? "",
  };
}

async function guardar(identifier: string, value: string) {
  const db = clienteAuth();
  await db.verification.deleteMany({ where: { identifier } });
  await db.verification.create({
    data: { identifier, value, expiresAt: new Date(Date.now() + VIGENCIA_MS) },
  });
}

/** Opciones para confirmar con una passkey propia (solo las del usuario, con UV). */
export async function opcionesConfirmarConPasskey(): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
  const h = await headers();
  const userId = await usuarioActual(h);
  if (!userId) return null;
  const propias = await clienteAuth().passkey.findMany({
    where: { userId },
    select: { credentialID: true },
  });
  if (propias.length === 0) return null;
  const opciones = await generateAuthenticationOptions({
    rpID: rp(h).rpID,
    userVerification: "required",
    allowCredentials: propias.map((p) => ({ id: p.credentialID })),
  });
  await guardar(RETO + userId, opciones.challenge);
  return opciones;
}

async function verificarPasskey(userId: string, h: Headers, respuesta: unknown): Promise<boolean> {
  const r = respuestaEntradaWebAuthn(respuesta);
  if (!r) return false;
  const db = clienteAuth();
  const reto = await db.verification.findFirst({
    where: { identifier: RETO + userId, expiresAt: { gt: new Date() } },
  });
  await db.verification.deleteMany({ where: { identifier: RETO + userId } });
  const pk = await db.passkey.findFirst({ where: { userId, credentialID: r.id } });
  if (!reto || !pk) return false;
  const { rpID, origin } = rp(h);
  const v = await verifyAuthenticationResponse({
    response: r,
    expectedChallenge: reto.value,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: pk.credentialID,
      publicKey: new Uint8Array(Buffer.from(pk.publicKey, "base64")),
      counter: pk.counter,
    },
    requireUserVerification: true,
  }).catch(() => null);
  if (!v?.verified) return false;
  await db.passkey.update({
    where: { id: pk.id },
    data: { counter: v.authenticationInfo.newCounter },
  });
  return true;
}

/** Confirma la identidad del usuario con sesión; true si quedó la marca de 5 minutos. */
export async function confirmarIdentidad(c: Confirmacion): Promise<boolean> {
  const h = await headers();
  const userId = await usuarioActual(h);
  if (!userId) return false;
  let ok: boolean;
  try {
    if (c.tipo === "password") {
      await auth.api.verifyPassword({ body: { password: c.valor }, headers: h });
      ok = true;
    } else if (c.tipo === "codigo") {
      await auth.api.verifyTOTP({ body: { code: c.valor.replace(/\D/g, "") }, headers: h });
      ok = true;
    } else {
      ok = await verificarPasskey(userId, h, c.respuesta);
    }
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    ok = false;
  }
  if (ok) await guardar(PREFIJO_REAUTENTICACION + userId, "1");
  return ok;
}

/**
 * Purga los desafíos y marcas vencidos de `core.verifications` (CAR-286): el login pide un desafío
 * de passkey al cargar (autocompletado) y los que nadie usó quedan vencidos. Solo filas vencidas hace
 * más de una hora; un token vigente (recuperación, invitación) nunca se toca. La llama el cron diario.
 */
export async function purgarVerificacionesVencidas(): Promise<number> {
  const r = await clienteAuth().verification.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  return r.count;
}
