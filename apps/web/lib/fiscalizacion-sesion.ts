import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_FISCALIZACION = "opai_fiscalizacion";

export type SesionFiscalizacion = {
  tenantId: string;
  slug: string;
  correo: string;
  empleadorRut: string;
  via: "correo" | "clave";
  exp: number;
};

function secreto(): string {
  const s = process.env["BETTER_AUTH_SECRET"] ?? process.env["CRON_SECRET"];
  if (!s) throw new Error("Falta secreto para sesión de fiscalización");
  return `fiscalizacion:${s}`;
}

function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("base64url");
}

export function emitirSesionFiscalizacion(datos: Omit<SesionFiscalizacion, "exp">, horas = 8): string {
  const exp = Math.floor(Date.now() / 1000) + horas * 3600;
  const cuerpo = Buffer.from(JSON.stringify({ ...datos, exp }), "utf8").toString("base64url");
  return `${cuerpo}.${firmar(cuerpo)}`;
}

export function leerSesionFiscalizacion(token: string | undefined): SesionFiscalizacion | null {
  if (!token) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = firmar(cuerpo);
  try {
    if (esperada.length !== firma.length || !timingSafeEqual(Buffer.from(esperada), Buffer.from(firma))) return null;
  } catch {
    return null;
  }
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")) as SesionFiscalizacion;
    if (datos.exp < Math.floor(Date.now() / 1000)) return null;
    return datos;
  } catch {
    return null;
  }
}