import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";

import { executeCapability, type Resultado } from "@opai/capabilities";
import { marcacionPublicaPorCodigo, normalizarCodigoMarcacionPublica, type MarcacionPublicaResuelta } from "@opai/db";

import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";
import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

export type EnlaceMarcacionVista = { instalacionNombre: string; empresaNombre: string };

async function topeMiss(ip: string): Promise<boolean> {
  const { ventanaMs, maximoIp, maximoGlobal } = LIMITES.marcarPublicaMiss;
  const [porIp, global] = await Promise.all([
    permitir(`marcar-publica-miss-ip:${ip}`, maximoIp, ventanaMs, { fallarCerrado: true }),
    permitir("marcar-publica-miss-global", maximoGlobal, ventanaMs, { fallarCerrado: true }),
  ]);
  return porIp && global;
}

async function topeIp(ip: string): Promise<boolean> {
  const { maximo, ventanaMs } = LIMITES.marcarPublica;
  return permitir(`marcar-publica-ip:${ip}`, maximo, ventanaMs, { fallarCerrado: true });
}

async function resolverCodigoMarcacion(
  codigo: string,
): Promise<"limitada" | null | MarcacionPublicaResuelta> {
  await connection();
  const ip = ipDeCabeceras(await headers());
  const norm = normalizarCodigoMarcacionPublica(codigo);
  if (!norm) return (await topeMiss(ip)) ? null : "limitada";
  if (!(await topeIp(ip))) return "limitada";
  const resuelto = await marcacionPublicaPorCodigo(codigo);
  if (!resuelto) return (await topeMiss(ip)) ? null : "limitada";
  return resuelto;
}

export async function verEnlaceMarcacion(
  codigo: string,
): Promise<{ limitada: true } | { ok: true; data: EnlaceMarcacionVista } | { ok: false }> {
  const resuelto = await resolverCodigoMarcacion(codigo);
  if (resuelto === "limitada") return { limitada: true };
  if (!resuelto) return { ok: false };
  const modulos = await fuentesReales.modulosActivos(resuelto.tenantId);
  if (!modulos.includes("asistencia")) return { ok: false };
  const ctx = contextoSistema(resuelto.tenantId, modulos);
  const r: Resultado = await executeCapability(ctx, "asistencia.marcas.enlace_publico_resolver", { codigo });
  return r.ok ? { ok: true, data: r.data as EnlaceMarcacionVista } : { ok: false };
}

/** Contexto con tenant fijado para marcar; `null` si el código no existe o la empresa no tiene asistencia. */
export async function contextoMarcacionPublica(codigo: string) {
  const resuelto = await resolverCodigoMarcacion(codigo);
  if (resuelto === "limitada") return "limitada" as const;
  if (!resuelto) return null;
  const modulos = await fuentesReales.modulosActivos(resuelto.tenantId);
  if (!modulos.includes("asistencia")) return null;
  return { ctx: contextoSistema(resuelto.tenantId, modulos), ...resuelto };
}