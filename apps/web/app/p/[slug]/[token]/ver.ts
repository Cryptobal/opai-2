import "server-only";

import { headers } from "next/headers";

import { crearContexto, executeCapability, type Resultado } from "@opai/capabilities";
import { tenantPorSlug } from "@opai/db";

import { medidorDiferido } from "@/lib/medidor";
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
  const permitido = await permitir(
    `cotizacion-publica:${ipDeCabeceras(await headers())}:${token}`,
    LIMITES.verificar.maximo,
    LIMITES.verificar.ventanaMs,
    { fallarCerrado: true },
  );
  if (!permitido) return { limitada: true };
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return { ok: false };
  // El enlace solo existe si CPQ creó la cotización: el módulo se da por activo (como el formulario web).
  const ctx = crearContexto({
    tenantId: tenant.id,
    actor: { tipo: "system" },
    modulosActivos: ["cpq"],
    medidor: medidorDiferido,
  });
  const r: Resultado = await executeCapability(ctx, "cpq.compartir.ver", { token });
  return r.ok ? { ok: true, data: r.data as CotizacionPublica } : { ok: false };
}
