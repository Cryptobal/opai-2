"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { crearContexto, executeCapability, type Resultado } from "@opai/capabilities";
import { auth, crearUsuarioConPassword, getSession } from "@opai/auth";
import { tenantPorSlug } from "@opai/db";

import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";
import { COOKIE_TENANT } from "@/lib/tenant-actual";
import { medidorDiferido } from "@/lib/medidor";

asegurarRegistro();

type Usuario = { id: string; name: string; email: string };

/** Tope alcanzado: la red (wifi/CGNAT) hizo demasiados intentos; se distingue de «no existe». */
type Limitada = { ok: false; limitada: true };
type VistaInvitacion = Resultado | Limitada | null;

/**
 * Rate limit del flujo de invitación por IP **junto al token** (NÚCLEO-B): un alta masiva de guardias
 * desde la misma red (una wifi, o CGNAT de Entel/Movistar) no se bloquea entre invitaciones distintas,
 * porque cada token tiene su propia ventana. El mismo límite cubre ver, aceptar y pedir otra para ese
 * token, así que no se puede sortear uno abusando de otro.
 */
async function invitacionPermitida(token: string): Promise<boolean> {
  // Fallo cerrado (no cae a memoria): el flujo de invitación crea cuentas, así que si la base del límite
  // cae es preferible frenar y mostrar «demasiados intentos» que abrir el alta al abuso por instancia.
  return permitir(
    `invitacion-ip:${ipDeCabeceras(await headers())}:${token}`,
    LIMITES.invitacion.maximo,
    LIMITES.invitacion.ventanaMs,
    { fallarCerrado: true },
  );
}

/** Lee la invitación sin consumir tope (quien llama ya lo cobró). */
async function leerInvitacion(slug: string, token: string): Promise<Resultado | null> {
  const ctx = await contexto(slug);
  return ctx ? executeCapability(ctx, "core.invitations.peek", { token }) : null;
}

/** Contexto en el tenant de la invitación: sistema (ver, pedir otra) o el usuario que acepta. */
async function contexto(slug: string, usuario?: Usuario) {
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return null;
  return crearContexto({
    tenantId: tenant.id,
    actor: usuario ? { tipo: "user", id: usuario.id } : { tipo: "system" },
    usuario: usuario
      ? { id: usuario.id, nombre: usuario.name, email: usuario.email, platformRole: null }
      : null,
    portal: "erp",
    medidor: medidorDiferido,
  });
}

export async function verInvitacion(slug: string, token: string): Promise<VistaInvitacion> {
  if (!(await invitacionPermitida(token))) return { ok: false, limitada: true };
  return leerInvitacion(slug, token);
}

/** Acepta con el usuario dado. No cobra tope: quien llama (aceptar/registrar) ya lo hizo. */
async function aceptarComo(slug: string, token: string, usuario: Usuario): Promise<string> {
  const ctx = await contexto(slug, usuario);
  if (!ctx) return "La invitación no existe.";
  const r = await executeCapability(ctx, "core.invitations.accept", { token });
  if (!r.ok) return r.error.message;
  (await cookies()).set(COOKIE_TENANT, ctx.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  // El siguiente request carga la membresía recién creada, no la identidad anterior al alta.
  redirect("/elegir-empresa");
}

/** Usuario con sesión: acepta la invitación (su correo debe coincidir). */
export async function aceptarInvitacion(slug: string, token: string): Promise<string> {
  const sesion = await getSession();
  if (!sesion) return "Inicia sesión para aceptar.";
  // Sesión que aún espera el segundo factor (Google o contraseña con passkey, CAR-286): no acepta.
  const conFactor = sesion.user.twoFactorEnabled === true || sesion.user.passkeyEnabled === true;
  if (conFactor && sesion.session.mfaVerified !== true) return "Completa el segundo factor.";
  if (!(await invitacionPermitida(token))) return "Demasiados intentos. Inténtalo más tarde.";
  return aceptarComo(slug, token, sesion.user);
}

/** Sin cuenta: crea el usuario con el correo invitado, inicia sesión y acepta. */
export async function registrarYAceptar(
  slug: string,
  token: string,
  nombre: string,
  password: string,
) {
  // El tope se cobra una sola vez, antes de crear el usuario: si cayera entre ver y aceptar, la cuenta
  // quedaría creada sin aceptar la invitación. `aceptarComo` ya no vuelve a cobrar en este camino.
  if (!(await invitacionPermitida(token))) return "Demasiados intentos. Inténtalo más tarde.";
  const vista = await leerInvitacion(slug, token);
  if (!vista?.ok) return "La invitación no existe.";
  const datos = vista.data as { email: string; estado: string; usuarioExiste: boolean };
  if (datos.estado !== "pendiente") return "La invitación ya no es válida.";
  if (datos.usuarioExiste) return "Ya tienes cuenta: inicia sesión para aceptar.";
  let id: string;
  try {
    ({ id } = await crearUsuarioConPassword({ email: datos.email, nombre, password }));
    await auth.api.signInEmail({
      body: { email: datos.email, password },
      headers: await headers(),
    });
  } catch (e) {
    return e instanceof Error ? e.message : "No pudimos crear tu cuenta.";
  }
  // Fuera del try: aceptar redirige (redirect lanza) al terminar.
  return aceptarComo(slug, token, { id, name: nombre, email: datos.email });
}

/** Invitación vencida o usada: avisa al administrador que la envió. */
export async function pedirNuevaInvitacion(slug: string, token: string): Promise<boolean> {
  if (!(await invitacionPermitida(token))) return false;
  const ctx = await contexto(slug);
  if (!ctx) return false;
  const r = await executeCapability(ctx, "core.invitations.request_new", { token });
  return r.ok;
}
