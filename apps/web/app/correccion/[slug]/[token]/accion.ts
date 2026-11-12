"use server";

import { responderCorreccion } from "./ver";

export type EstadoRespuesta = { estado: "inicial" } | { estado: "listo"; resultado: "aceptada" | "objetada" } | { estado: "error"; texto: string };

/** Responde una corrección desde el enlace del correo personal: la identidad es el enlace más el RUT. */
export async function accionResponder(slug: string, token: string, _: EstadoRespuesta, datos: FormData): Promise<EstadoRespuesta> {
  const resultado = datos.get("resultado") === "objetada" ? "objetada" : "aceptada";
  const rut = String(datos.get("rut") ?? "").trim();
  const comentario = String(datos.get("comentario") ?? "").trim();
  if (rut.length < 8) return { estado: "error", texto: "Escribe tu RUT para confirmar que eres tú." };
  const r = await responderCorreccion(slug, { token, rut, resultado, comentario });
  if (r === "ok") return { estado: "listo", resultado };
  if (r === "limitada") return { estado: "error", texto: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." };
  if (r === "comentario") return { estado: "error", texto: "Para objetar escribe un comentario." };
  return { estado: "error", texto: "No pudimos confirmar tu identidad. Revisa el RUT e inténtalo de nuevo." };
}
