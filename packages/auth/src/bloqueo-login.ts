import { createHash } from "node:crypto";

import { clienteAuth } from "@opai/db";
import {
  cuentaBloqueada,
  type EstadoBloqueoLogin,
  trasExitoLogin,
  trasFalloLogin,
} from "@opai/domain";

/**
 * Bloqueo de login persistido (B1, Brief 07c). Lee y actualiza el estado por identidad y registra
 * cada intento en `core` (sin RLS, como `users`); el cálculo del umbral vive en `@opai/domain`. Se
 * engancha en Better Auth (ver `auth.ts`), así cubre tanto la Server Action como el POST directo a
 * `/api/auth/.../sign-in/email`. Sin datos personales en claro: el correo se guarda en hash.
 */
export const MENSAJE_PAUSA = "Hubo demasiados intentos. Vuelve a intentarlo en 15 minutos.";

/** Correo normalizado a hash SHA-256 (nunca se guarda ni se registra en claro, Ley 21.719). */
export function hashCorreo(correo: string): string {
  return createHash("sha256").update(correo.trim().toLowerCase()).digest("hex");
}

export type DatosIntento = { correo: string; ip: string | null; userAgent: string | null };

/** Datos del intento a partir del contexto del hook de Better Auth (correo del body, IP y agente). */
export function datosDeContexto(ctx: {
  body?: { email?: unknown } | null | undefined;
  headers?: Headers | null | undefined;
}): DatosIntento | null {
  const correo = typeof ctx.body?.email === "string" ? ctx.body.email : "";
  if (!correo) return null;
  const h = ctx.headers ?? null;
  const reenviada = h?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    correo,
    ip: reenviada || h?.get("x-real-ip") || null,
    userAgent: h?.get("user-agent") || null,
  };
}

async function usuarioPorCorreo(correo: string): Promise<{ id: string } | null> {
  return clienteAuth().user.findFirst({
    where: { email: { equals: correo.trim().toLowerCase(), mode: "insensitive" } },
    select: { id: true },
  });
}

async function estadoDe(userId: string): Promise<EstadoBloqueoLogin | null> {
  const b = await clienteAuth().loginBloqueo.findUnique({ where: { userId } });
  return b ? { fallos: b.fallos, bloqueadoHasta: b.bloqueadoHasta } : null;
}

async function guardarEstado(userId: string, estado: EstadoBloqueoLogin, ahora: Date): Promise<void> {
  const datos = { fallos: estado.fallos, bloqueadoHasta: estado.bloqueadoHasta, ultimoIntento: ahora };
  await clienteAuth().loginBloqueo.upsert({
    where: { userId },
    create: { userId, ...datos },
    update: datos,
  });
}

async function registrar(datos: DatosIntento, userId: string | null, exito: boolean, motivo: string) {
  await clienteAuth().loginIntento.create({
    data: { correoHash: hashCorreo(datos.correo), userId, exito, motivo, ip: datos.ip, userAgent: datos.userAgent },
  });
}

/**
 * Antes de validar la credencial: ¿la cuenta está pausada ahora? Si lo está, registra el intento y
 * devuelve `true` para que el hook rechace el ingreso (aunque la contraseña sea correcta).
 */
export async function loginPausado(datos: DatosIntento): Promise<boolean> {
  const usuario = await usuarioPorCorreo(datos.correo);
  if (!usuario) return false;
  if (!cuentaBloqueada(await estadoDe(usuario.id), new Date())) return false;
  await registrar(datos, usuario.id, false, "bloqueada");
  return true;
}

/**
 * Después del intento: `codigo === null` es ingreso correcto (limpia el contador); el código de
 * credenciales inválidas suma un fallo y, al umbral, fija la pausa; otros desenlaces solo se registran.
 */
export async function registrarResultado(datos: DatosIntento, codigo: string | null): Promise<void> {
  const usuario = await usuarioPorCorreo(datos.correo);
  const ahora = new Date();
  if (codigo === null) {
    if (usuario) await guardarEstado(usuario.id, trasExitoLogin(), ahora);
    await registrar(datos, usuario?.id ?? null, true, "ok");
    return;
  }
  if (codigo === "INVALID_EMAIL_OR_PASSWORD") {
    if (usuario) await guardarEstado(usuario.id, trasFalloLogin(await estadoDe(usuario.id), ahora), ahora);
    await registrar(datos, usuario?.id ?? null, false, "credenciales");
    return;
  }
  await registrar(datos, usuario?.id ?? null, false, codigo === "ACCOUNT_SUSPENDED" ? "suspendida" : codigo.toLowerCase());
}
