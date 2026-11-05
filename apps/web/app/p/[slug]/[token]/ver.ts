import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";

import { executeCapability, type Resultado } from "@opai/capabilities";
import { tenantPorSlug } from "@opai/db";

import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";
import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

export type CotizacionPublica = {
  empresa: string;
  codigo: string;
  titulo: string;
  moneda: string;
  ventaMensualClp: number | null;
  validaHasta: string | null;
  venceEn: Date;
  secciones: { nombre: string; lineas: { nombre: string; posiciones: number }[] }[];
};

/**
 * Abre la cotización compartida (`/p/<slug>/<token>`): público, sin sesión. El tenant sale del slug
 * y el token de 128 bits es la credencial; revocado, vencido o inexistente se ven igual. Tope por IP
 * y por token, cerrado si la base falla (cada apertura cuenta una vista).
 */
export async function verCotizacionPublica(
  slug: string,
  token: string,
): Promise<{ limitada: true } | { ok: true; data: CotizacionPublica } | { ok: false }> {
  // Pide el request real antes de tocar reloj o base: sin esto, Next 16 (Cache Components) evalúa el
  // rate limit durante el prerender, lanza «Date.now() while prerendering» y todo enlace parece inválido.
  await connection();
  const ip = ipDeCabeceras(await headers());
  // Dos topes: por IP y token, y por IP sola (sin el token, para que probar tokens distintos no lo evada).
  const [porToken, porIp] = await Promise.all([
    permitir(`cotizacion-publica:${ip}:${token}`, LIMITES.verificar.maximo, LIMITES.verificar.ventanaMs, {
      fallarCerrado: true,
    }),
    permitir(`cotizacion-publica-ip:${ip}`, LIMITES.verificar.maximo * 2, LIMITES.verificar.ventanaMs, {
      fallarCerrado: true,
    }),
  ]);
  if (!porToken || !porIp) return { limitada: true };
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return { ok: false };
  // Módulos reales de la empresa: con Portal Cliente o sin CPQ el enlace no abre (NOT_FOUND parejo).
  const modulos = await fuentesReales.modulosActivos(tenant.id);
  if (!modulos.includes("cpq")) return { ok: false };
  // Con el registro de capacidades del proceso armado (`asegurarRegistro` dentro de `contextoSistema`).
  const ctx = contextoSistema(tenant.id, modulos);
  const r: Resultado = await executeCapability(ctx, "cpq.compartir.ver", { token });
  return r.ok ? { ok: true, data: r.data as CotizacionPublica } : { ok: false };
}
