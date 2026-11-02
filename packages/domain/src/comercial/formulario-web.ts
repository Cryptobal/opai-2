import { createHash, randomBytes } from "node:crypto";

/** Prefijo visible del token del formulario web (no confundir con API keys `opai_<slug>_`). */
export const PREFIJO_TOKEN_FORMULARIO = "opai_frm_";

export function generarTokenFormulario(): string {
  return `${PREFIJO_TOKEN_FORMULARIO}${randomBytes(24).toString("base64url")}`;
}

export function hashTokenFormulario(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sufijoToken(token: string): string {
  return token.slice(-4);
}

/** Ruta pública del endpoint por slug de tenant (sin secretos). */
export function rutaEndpointFormulario(slug: string): string {
  return `/api/t/${slug}/solicitudes`;
}

/**
 * Si hay dominio autorizado, exige que Origin o Referer lo contengan (solo host, sin protocolo).
 * Sin cabeceras de origen se acepta (p. ej. curl server-side desde gard.cl).
 */
export function origenPermitido(
  dominioAutorizado: string | null | undefined,
  origin: string | null,
  referer: string | null,
): boolean {
  const dom = dominioAutorizado?.trim().toLowerCase();
  if (!dom) return true;
  const hosts = [origin, referer]
    .filter(Boolean)
    .map((u) => {
      try {
        return new URL(u as string).hostname.toLowerCase();
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];
  if (hosts.length === 0) return true;
  return hosts.some((h) => h === dom || h.endsWith(`.${dom}`));
}

export function textoOriginalDesdeFormulario(input: {
  mensaje: string;
  asunto?: string | null;
}): string {
  const asunto = input.asunto?.trim();
  const cuerpo = input.mensaje.trim();
  if (asunto) return `Asunto: ${asunto}\n\n${cuerpo}`;
  return cuerpo;
}
