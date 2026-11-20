import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";

import { tenantPorSlug } from "@opai/db";

import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";
import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

/** Contexto de sistema para enlaces públicos de Asistencia (corrección, contingencia, etc.). */
export async function contextoPublicoAsistencia(slug: string, token: string, prefijo: string) {
  await connection();
  const ip = ipDeCabeceras(await headers());
  const [porToken, porIp, porTokenSolo] = await Promise.all([
    permitir(`${prefijo}:${ip}:${token.slice(0, 12)}`, LIMITES.verificar.maximo, LIMITES.verificar.ventanaMs, { fallarCerrado: true }),
    permitir(`${prefijo}-ip:${ip}`, LIMITES.verificar.maximo * 2, LIMITES.verificar.ventanaMs, { fallarCerrado: true }),
    permitir(`${prefijo}-enlace:${token.slice(0, 24)}`, LIMITES.verificar.maximo, LIMITES.verificar.ventanaMs * 10, { fallarCerrado: true }),
  ]);
  if (!porToken || !porIp || !porTokenSolo) return "limitada" as const;
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return null;
  const modulos = await fuentesReales.modulosActivos(tenant.id);
  if (!modulos.includes("asistencia")) return null;
  return contextoSistema(tenant.id, modulos);
}