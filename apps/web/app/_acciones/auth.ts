"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  cambiarPassword,
  cerrarSesion,
  entrarConPassword,
  passwordValida,
  pedirRecuperacion,
  restablecerPassword,
  urlDeGoogle,
} from "@opai/auth";

import { destinoSeguro } from "@/app/(auth)/destino";
import { bloqueado, ipDeCabeceras, olvidar, permitir, registrarFallo } from "@/lib/rate-limit";

/**
 * "Tras 5 intentos pausaremos el acceso por 15 minutos" (diseño de acceso aprobado). Solo cuentan
 * los fallos: 5 por correo y 30 por IP (una oficina comparte IP y no debe bloquearse por éxitos).
 */
const INTENTOS = 5;
const INTENTOS_IP = 30;
const PAUSA_MS = 15 * 60_000;

export type EstadoLogin =
  | { tipo: "inicial" }
  | { tipo: "error"; titulo: string; texto: string }
  | { tipo: "suspendida"; texto: string };

const PAUSADO: EstadoLogin = {
  tipo: "error",
  titulo: "Pausamos el acceso",
  texto: "Hubo demasiados intentos. Vuelve a intentarlo en 15 minutos.",
};

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

async function ip(): Promise<string> {
  return ipDeCabeceras(await headers());
}

/** Login con correo y contraseña. Con éxito redirige al selector de empresa (o al destino). */
export async function accionEntrar(
  destino: string,
  _previo: EstadoLogin,
  form: FormData,
): Promise<EstadoLogin> {
  const email = texto(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const origen = await ip();
  const claveIp = `login-ip:${origen}`;
  const claveEmail = `login-email:${email}`;
  if (bloqueado(claveIp, INTENTOS_IP, PAUSA_MS) || bloqueado(claveEmail, INTENTOS, PAUSA_MS)) {
    return PAUSADO;
  }
  const r = await entrarConPassword(email, password);
  if (r.ok) olvidar(claveEmail);
  else if (r.fallo === "credenciales") {
    registrarFallo(claveIp, PAUSA_MS);
    registrarFallo(claveEmail, PAUSA_MS);
  }
  if (!r.ok) {
    if (r.fallo === "suspendida") return { tipo: "suspendida", texto: r.mensaje };
    // El bloqueo persistido por cuenta (B1) usa el mismo aviso genérico que el límite en memoria.
    if (r.fallo === "bloqueada") return PAUSADO;
    return {
      tipo: "error",
      titulo: "El correo o la contraseña no coinciden",
      texto:
        "Revisa los datos y vuelve a intentarlo. Tras 5 intentos pausaremos el acceso por 15 minutos.",
    };
  }
  redirect(`/elegir-empresa?next=${encodeURIComponent(destinoSeguro(destino))}`);
}

/** Inicia el flujo de Google (redirige al proveedor). */
export async function accionGoogle(destino: string): Promise<void> {
  const url = await urlDeGoogle(destinoSeguro(destino));
  redirect(url ?? "/login");
}

/** Cierra la sesión y va al destino interno indicado (por defecto, /login). */
export async function accionSalir(destino = "/login"): Promise<void> {
  await cerrarSesion();
  redirect(destino === "/login" ? destino : destinoSeguro(destino));
}

export type EstadoPassword = { estado: "inicial" | "listo"; error?: string };

export async function accionCambiarPassword(
  _previo: EstadoPassword,
  form: FormData,
): Promise<EstadoPassword> {
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  if (!passwordValida(nueva)) {
    return { estado: "inicial", error: "La contraseña nueva no cumple los requisitos." };
  }
  if (nueva !== String(form.get("repetir") ?? "")) {
    return { estado: "inicial", error: "Las contraseñas no coinciden." };
  }
  const r = await cambiarPassword(actual, nueva);
  return r.ok ? { estado: "listo" } : { estado: "inicial", error: r.mensaje };
}

export type EstadoRecuperacion = { enviadoA: string | null };

/** Pide el enlace. Responde igual exista o no la cuenta; 10 solicitudes por IP cada 15 minutos. */
export async function accionPedirRecuperacion(
  _previo: EstadoRecuperacion,
  form: FormData,
): Promise<EstadoRecuperacion> {
  const email = texto(form, "email").toLowerCase();
  if (email && permitir(`recuperar-ip:${await ip()}`, 10, PAUSA_MS)) {
    await pedirRecuperacion(email, "/recuperar");
  }
  return { enviadoA: email };
}

export type EstadoRestablecer = { listo: boolean; error?: string };

export async function accionRestablecer(
  token: string,
  _previo: EstadoRestablecer,
  form: FormData,
): Promise<EstadoRestablecer> {
  const nueva = String(form.get("nueva") ?? "");
  if (!passwordValida(nueva))
    return { listo: false, error: "La contraseña no cumple los requisitos." };
  if (nueva !== String(form.get("repetir") ?? "")) {
    return { listo: false, error: "Las contraseñas no coinciden." };
  }
  const r = await restablecerPassword(token, nueva);
  return r.ok ? { listo: true } : { listo: false, error: `${r.mensaje} Pide uno nuevo.` };
}
