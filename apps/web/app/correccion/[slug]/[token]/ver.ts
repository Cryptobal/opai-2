import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";

import { executeCapability, type Resultado } from "@opai/capabilities";
import { tenantPorSlug } from "@opai/db";

import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";
import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

export type CorreccionVista = {
  original: string;
  propuesta: string;
  motivo: string;
  venceEn: string | null;
  estado: "pendiente" | "aceptada" | "objetada" | "vencida";
};

/** Resuelve la empresa por slug y arma el contexto del sistema; sin sesión, con tope por IP que falla cerrado. */
export async function contextoPublico(slug: string, token: string) {
  // Lectura en cada petición: ni el rate limit ni la base se evalúan durante el prerender.
  await connection();
  const ip = ipDeCabeceras(await headers());
  const [porToken, porIp] = await Promise.all([
    permitir(`correccion-publica:${ip}:${token.slice(0, 12)}`, LIMITES.verificar.maximo, LIMITES.verificar.ventanaMs, { fallarCerrado: true }),
    permitir(`correccion-publica-ip:${ip}`, LIMITES.verificar.maximo * 2, LIMITES.verificar.ventanaMs, { fallarCerrado: true }),
  ]);
  if (!porToken || !porIp) return "limitada" as const;
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return null;
  const modulos = await fuentesReales.modulosActivos(tenant.id);
  if (!modulos.includes("asistencia")) return null;
  return contextoSistema(tenant.id, modulos);
}

export async function verCorreccion(
  slug: string,
  token: string,
): Promise<{ limitada: true } | { ok: true; data: CorreccionVista } | { ok: false }> {
  const ctx = await contextoPublico(slug, token);
  if (ctx === "limitada") return { limitada: true };
  if (!ctx) return { ok: false };
  const r: Resultado = await executeCapability(ctx, "asistencia.correcciones.ver_enlace", { token });
  return r.ok ? { ok: true, data: r.data as CorreccionVista } : { ok: false };
}

export async function responderCorreccion(
  slug: string,
  entrada: { token: string; rut: string; resultado: "aceptada" | "objetada"; comentario: string },
): Promise<"ok" | "limitada" | "rechazada" | "comentario"> {
  const ctx = await contextoPublico(slug, entrada.token);
  if (ctx === "limitada") return "limitada";
  if (!ctx) return "rechazada";
  const r: Resultado = await executeCapability(ctx, "asistencia.correcciones.responder_enlace", {
    token: entrada.token,
    rut: entrada.rut,
    resultado: entrada.resultado,
    ...(entrada.comentario ? { comentario: entrada.comentario } : {}),
  });
  if (r.ok) return "ok";
  return r.error.code === "UNPROCESSABLE" ? "comentario" : "rechazada";
}
