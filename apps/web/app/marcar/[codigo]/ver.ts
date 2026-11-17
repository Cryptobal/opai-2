import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";

import { executeCapability, type Resultado } from "@opai/capabilities";
import { marcacionPublicaPorCodigo } from "@opai/db";

import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";
import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

export type EnlaceMarcacionVista = { instalacionNombre: string; empresaNombre: string };

async function topePublico(codigo: string) {
  await connection();
  const ip = ipDeCabeceras(await headers());
  const prefijo = codigo.slice(0, 8).toUpperCase();
  const [porCodigo, porIp, porEnlace] = await Promise.all([
    permitir(`marcar-publica:${ip}:${prefijo}`, LIMITES.marcarPublica.maximo, LIMITES.marcarPublica.ventanaMs, { fallarCerrado: true }),
    permitir(`marcar-publica-ip:${ip}`, LIMITES.marcarPublica.maximo * 2, LIMITES.marcarPublica.ventanaMs, { fallarCerrado: true }),
    permitir(`marcar-publica-enlace:${prefijo}`, LIMITES.marcarPublica.maximo, LIMITES.marcarPublica.ventanaMs * 10, { fallarCerrado: true }),
  ]);
  return porCodigo && porIp && porEnlace;
}

export async function verEnlaceMarcacion(
  codigo: string,
): Promise<{ limitada: true } | { ok: true; data: EnlaceMarcacionVista } | { ok: false }> {
  if (!(await topePublico(codigo))) return { limitada: true };
  const resuelto = await marcacionPublicaPorCodigo(codigo);
  if (!resuelto) return { ok: false };
  const modulos = await fuentesReales.modulosActivos(resuelto.tenantId);
  if (!modulos.includes("asistencia")) return { ok: false };
  const ctx = contextoSistema(resuelto.tenantId, modulos);
  const r: Resultado = await executeCapability(ctx, "asistencia.marcas.enlace_publico_resolver", { codigo });
  return r.ok ? { ok: true, data: r.data as EnlaceMarcacionVista } : { ok: false };
}

/** Contexto con tenant fijado para marcar; `null` si el código no existe o la empresa no tiene asistencia. */
export async function contextoMarcacionPublica(codigo: string) {
  if (!(await topePublico(codigo))) return "limitada" as const;
  const resuelto = await marcacionPublicaPorCodigo(codigo);
  if (!resuelto) return null;
  const modulos = await fuentesReales.modulosActivos(resuelto.tenantId);
  if (!modulos.includes("asistencia")) return null;
  return { ctx: contextoSistema(resuelto.tenantId, modulos), ...resuelto };
}