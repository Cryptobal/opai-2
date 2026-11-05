import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";

import { executeCapability, type Resultado } from "@opai/capabilities";
import { tenantPorSlug } from "@opai/db";

import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";
import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

export type MarcaVerificada = {
  valida: boolean;
  integra?: boolean;
  tipo?: string;
  horaServidor?: string;
  empresa?: string;
  establecimiento?: string | null;
  codigo?: string;
};

/**
 * Verifica una marca por su hash (`/verificar/marca/<slug>/<hash>`): público, sin sesión. El tenant
 * sale del slug y el hash de 256 bits es la credencial; inexistente o de otra empresa se ve igual.
 * Tope por IP, cerrado si la base falla. Muestra solo lo mínimo del comprobante.
 */
export async function verificarMarcaPublica(
  slug: string,
  hash: string,
): Promise<{ limitada: true } | { ok: true; data: MarcaVerificada } | { ok: false }> {
  // Lectura en cada petición: ni el rate limit ni la base se evalúan durante el prerender.
  await connection();
  const ip = ipDeCabeceras(await headers());
  const [porHash, porIp] = await Promise.all([
    permitir(`marca-publica:${ip}:${hash}`, LIMITES.verificar.maximo, LIMITES.verificar.ventanaMs, { fallarCerrado: true }),
    permitir(`marca-publica-ip:${ip}`, LIMITES.verificar.maximo * 2, LIMITES.verificar.ventanaMs, { fallarCerrado: true }),
  ]);
  if (!porHash || !porIp) return { limitada: true };
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return { ok: false };
  const modulos = await fuentesReales.modulosActivos(tenant.id);
  if (!modulos.includes("asistencia")) return { ok: false };
  // contextoSistema arma el registro de capacidades del proceso: esta ruta no pasa por el layout con sesión.
  const ctx = contextoSistema(tenant.id, modulos);
  const r: Resultado = await executeCapability(ctx, "asistencia.marcas.verificar", { hash });
  const data = r.ok ? (r.data as MarcaVerificada) : null;
  return data?.valida ? { ok: true, data } : { ok: false };
}
