"use server";

import { responderContingencia } from "./ver";

export type EstadoRespuesta =
  | { estado: "inicial" }
  | { estado: "listo"; decision: "aceptada" | "rechazada" }
  | { estado: "error"; texto: string };

export async function accionResponder(
  slug: string,
  token: string,
  _: EstadoRespuesta,
  datos: FormData,
): Promise<EstadoRespuesta> {
  const decision = datos.get("decision") === "rechazada" ? "rechazada" : "aceptada";
  const rut = String(datos.get("rut") ?? "").trim();
  const comentario = String(datos.get("comentario") ?? "").trim();
  if (rut.length < 8) return { estado: "error", texto: "Escribe tu RUT para confirmar que eres tú." };
  const r = await responderContingencia(slug, { token, rut, decision, comentario });
  if (r === "ok") return { estado: "listo", decision };
  if (r === "limitada") return { estado: "error", texto: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." };
  if (r === "comentario") return { estado: "error", texto: "Para objetar escribe un comentario." };
  return { estado: "error", texto: "No pudimos confirmar tu identidad. Revisa el RUT e inténtalo de nuevo." };
}