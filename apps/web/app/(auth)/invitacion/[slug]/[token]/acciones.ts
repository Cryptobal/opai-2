"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { crearContexto, executeCapability } from "@opai/capabilities";
import { auth, crearUsuarioConPassword, getSession } from "@opai/auth";
import { globales } from "@opai/db";

import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";
import { COOKIE_TENANT } from "@/lib/tenant-actual";
import { medidorDiferido } from "@/lib/medidor";

asegurarRegistro();

type Usuario = { id: string; name: string; email: string };

/**
 * Rate limit por IP del flujo de invitación (NÚCLEO-B): acota el sondeo de tokens. El mismo límite
 * cubre ver, aceptar y pedir otra, así que no se puede sortear uno abusando de otro.
 */
async function invitacionPermitida(): Promise<boolean> {
  return permitir(
    `invitacion-ip:${ipDeCabeceras(await headers())}`,
    LIMITES.invitacion.maximo,
    LIMITES.invitacion.ventanaMs,
  );
}

/** Contexto en el tenant de la invitación: sistema (ver, pedir otra) o el usuario que acepta. */
async function contexto(slug: string, usuario?: Usuario) {
  const tenant = await globales().tenant.findUnique({ where: { slug } });
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

export async function verInvitacion(slug: string, token: string) {
  if (!(await invitacionPermitida())) return null;
  const ctx = await contexto(slug);
  return ctx ? executeCapability(ctx, "core.invitations.peek", { token }) : null;
}

async function aceptarComo(slug: string, token: string, usuario: Usuario): Promise<string> {
  if (!(await invitacionPermitida())) return "Demasiados intentos. Inténtalo más tarde.";
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
  redirect("/");
}

/** Usuario con sesión: acepta la invitación (su correo debe coincidir). */
export async function aceptarInvitacion(slug: string, token: string): Promise<string> {
  const sesion = await getSession();
  if (!sesion) return "Inicia sesión para aceptar.";
  return aceptarComo(slug, token, sesion.user);
}

/** Sin cuenta: crea el usuario con el correo invitado, inicia sesión y acepta. */
export async function registrarYAceptar(
  slug: string,
  token: string,
  nombre: string,
  password: string,
) {
  const vista = await verInvitacion(slug, token);
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
  if (!(await invitacionPermitida())) return false;
  const ctx = await contexto(slug);
  if (!ctx) return false;
  const r = await executeCapability(ctx, "core.invitations.request_new", { token });
  return r.ok;
}
