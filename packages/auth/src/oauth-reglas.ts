import { createHash } from "node:crypto";

// Reglas puras del OAuth del MCP (CAR-247, ADR-098), sin base ni Better Auth, para poder probarlas.

/** Alcances que una app puede pedir. Nunca `platform`: Plataforma solo con API key explícita. */
export const ALCANCES_OAUTH = ["mcp:leer", "mcp:escribir", "offline_access"] as const;

/** Vida de los tokens: acceso 1 hora; refresh 30 días, con rotación. */
export const VIDA_ACCESO_SEGUNDOS = 60 * 60;
export const VIDA_REFRESH_SEGUNDOS = 30 * 24 * 60 * 60;

export type MembresiaOAuth = { tenantId: string; estado: string; tenantEstado: string };

const usables = (m: readonly MembresiaOAuth[]) =>
  m.filter((x) => x.estado === "activa" && x.tenantEstado !== "suspendido");

/**
 * Con más de una empresa usable, la persona elige con cuál conectar la app; la elección vale solo si
 * es una de sus membresías activas en una empresa no suspendida.
 */
export function necesitaElegirEmpresa(
  membresias: readonly MembresiaOAuth[],
  elegida: string | null | undefined,
): boolean {
  const u = usables(membresias);
  if (u.length <= 1) return false;
  return !u.some((m) => m.tenantId === elegida);
}

/**
 * Empresa a la que queda atado el consentimiento y sus tokens (`reference_id`). Falla si no hay una
 * empresa usable o si la elegida no es de la persona: nunca se emite un token sin empresa válida.
 */
export function empresaDelConsentimiento(
  membresias: readonly MembresiaOAuth[],
  elegida: string | null | undefined,
): string {
  const u = usables(membresias);
  // Una elección que no es usable nunca se reemplaza en silencio por otra empresa.
  const m = elegida ? u.find((x) => x.tenantId === elegida) : u.length === 1 ? u[0] : undefined;
  if (!m) throw new Error("Empresa no válida para autorizar la app.");
  return m.tenantId;
}

/** Hash con el que el proveedor guarda los tokens (`storeTokens: "hashed"`): SHA-256, base64url. */
export const hashTokenOAuth = (token: string): string =>
  createHash("sha256").update(token).digest("base64url");

export type EstadoTokenOAuth = "vigente" | "vencido" | "revocado";

export function estadoTokenOAuth(
  t: { expiresAt: Date; revoked: Date | null; clienteActivo: boolean },
  ahora: Date,
): EstadoTokenOAuth {
  if (t.revoked || !t.clienteActivo) return "revocado";
  return t.expiresAt.getTime() > ahora.getTime() ? "vigente" : "vencido";
}
