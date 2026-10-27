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
import {
  bloqueado,
  ipDeCabeceras,
  LIMITES,
  olvidar,
  permitir,
  registrarFallo,
} from "@/lib/rate-limit";

/**
 * «Tras varios intentos pausaremos el acceso unos minutos» (texto de CAR-16: no fija el número, que vive en `@opai/domain`). Solo cuentan
 * los fallos: 5 por correo y 30 por IP (una oficina comparte IP y no debe bloquearse por éxitos).
 */
const INTENTOS = 5;
const INTENTOS_IP = 30;
const PAUSA_MS = 15 * 60_000;

export type EstadoLogin =
  | { tipo: "inicial" }
  | { tipo: "error"; n: number; titulo: string; texto: string }
  | { tipo: "pausado"; n: number; titulo: string; texto: string }
  | { tipo: "suspendida"; n: number; texto: string };

/** Secuencia del intento: cambia el `key` del aviso para que el lector de pantalla lo reanuncie. */
const siguiente = (previo: EstadoLogin): number => ("n" in previo ? previo.n : 0) + 1;

/** Pausa por fuerza bruta: tono de aviso (no error), sin tiempo exacto (la ventana es deslizante). */
const pausado = (n: number): EstadoLogin => ({
  tipo: "pausado",
  n,
  titulo: "Pausamos el acceso",
  texto: "Hubo demasiados intentos. Vuelve a intentarlo en unos minutos.",
});

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
  const n = siguiente(_previo);
  const origen = await ip();
  const claveIp = `login-ip:${origen}`;
  const claveEmail = `login-email:${email}`;
  if (bloqueado(claveIp, INTENTOS_IP, PAUSA_MS) || bloqueado(claveEmail, INTENTOS, PAUSA_MS)) {
    return pausado(n);
  }
  const r = await entrarConPassword(email, password);
  if (r.ok) olvidar(claveEmail);
  else if (r.fallo === "credenciales") {
    registrarFallo(claveIp, PAUSA_MS);
    registrarFallo(claveEmail, PAUSA_MS);
  }
  if (!r.ok) {
    if (r.fallo === "suspendida") return { tipo: "suspendida", n, texto: r.mensaje };
    // El bloqueo persistido por cuenta (B1) usa el mismo aviso genérico que el límite en memoria.
    if (r.fallo === "bloqueada") return pausado(n);
    return {
      tipo: "error",
      n,
      titulo: "El correo o la contraseña no coinciden",
      texto:
        "Revisa los datos y vuelve a intentarlo. Tras varios intentos pausaremos el acceso unos minutos.",
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
  // Fallo cerrado: si la base del límite cae, no se cae a memoria (que relajaría el tope por instancia);
  // se prefiere no enviar antes que abrir el envío de recuperación al abuso. La respuesta es la misma.
  const puede =
    !!email &&
    (await permitir(`recuperar-ip:${await ip()}`, LIMITES.recuperar.maximo, LIMITES.recuperar.ventanaMs, {
      fallarCerrado: true,
    }));
  if (puede) {
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
