"use server";

import type { EstadoForm } from "@/app/_components/enlace-respuesta/formulario-rut";

import { responderContingencia } from "./ver";

export async function accionResponder(
  slug: string,
  token: string,
  _: EstadoForm,
  datos: FormData,
): Promise<EstadoForm> {
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