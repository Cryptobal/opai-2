"use server";

import { headers } from "next/headers";

import { crearContexto, executeCapability, type Resultado } from "@opai/capabilities";
import { tenantPorSlug } from "@opai/db";

import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";
import { medidorDiferido } from "@/lib/medidor";

export type DatosFirma = {
  nombre: string;
  rol: string;
  estadoFirmante: string;
  estadoSolicitud: string;
  clase: string;
  nivel: string;
  mensaje: string | null;
  plazoVence: string;
  documentoVersion: number;
};

/**
 * Tope por IP y por token (NÚCLEO-B): un enlace de firma no se agota por el tráfico de otro, y una
 * red compartida no bloquea a todos los firmantes. Falla cerrado: firmar es irreversible (R4, R6).
 */
async function firmaPermitida(token: string): Promise<boolean> {
  return permitir(
    `firma-ip:${ipDeCabeceras(await headers())}:${token}`,
    LIMITES.firma.maximo,
    LIMITES.firma.ventanaMs,
    { fallarCerrado: true },
  );
}

async function contexto(slug: string) {
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return null;
  return crearContexto({
    tenantId: tenant.id,
    actor: { tipo: "system" },
    medidor: medidorDiferido,
  });
}

export async function verFirma(slug: string, token: string): Promise<Resultado | { ok: false; limitada: true }> {
  if (!(await firmaPermitida(token))) return { ok: false, limitada: true };
  const ctx = await contexto(slug);
  if (!ctx) return { ok: false, error: { code: "NOT_FOUND", message: "El enlace no existe." } };
  return executeCapability(ctx, "core.firmas.ver_firmante", { token });
}

export async function firmarPorEnlace(
  slug: string,
  token: string,
  input: { metodo: "trazo" | "nombre"; nombreFirma: string; textoAceptacion: string; versionAceptacion: string },
): Promise<string | null> {
  if (!(await firmaPermitida(token))) return "Demasiados intentos. Inténtalo más tarde.";
  const ctx = await contexto(slug);
  if (!ctx) return "El enlace no existe.";
  const r = await executeCapability(ctx, "core.firmas.firmar", { token, aceptaMedio: true, ...input });
  return r.ok ? null : r.error.message;
}

export async function rechazarPorEnlace(slug: string, token: string, motivo: string): Promise<string | null> {
  if (!(await firmaPermitida(token))) return "Demasiados intentos. Inténtalo más tarde.";
  const ctx = await contexto(slug);
  if (!ctx) return "El enlace no existe.";
  const r = await executeCapability(ctx, "core.firmas.rechazar", { token, motivo });
  return r.ok ? null : r.error.message;
}

/**
 * URL firmada del documento congelado para revisarlo antes de firmar (firma.md R5). Sin filtrar
 * existencia a terceros: un token inválido devuelve `null`, igual que un enlace vencido.
 */
export async function urlDocumentoPorEnlace(
  slug: string,
  token: string,
): Promise<{ url: string; nombre: string; mime: string } | null> {
  if (!(await firmaPermitida(token))) return null;
  const ctx = await contexto(slug);
  if (!ctx) return null;
  const r = await executeCapability(ctx, "core.firmas.documento_url", { token });
  return r.ok ? (r.data as { url: string; nombre: string; mime: string }) : null;
}
