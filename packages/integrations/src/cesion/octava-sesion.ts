// Sesión Octava por tenant: ObtenerToken con el RUT y la contraseña de acceso de la integración (token de 6 h).
// Lo que persiste lo decide el llamador (`AlmacenSesionOctava`): aquí no hay base ni process.env.
import type { OctavaAmbiente } from "./octava-api";
import type { ClienteOctava } from "./octava-cliente";
import { sinNull } from "./octava-http";

/** usuario = RUT de acceso a la API de Octava (RUTACCESOAPI); clave = su contraseña (PASSWORDACCESOAPI). */
export type CredencialesOctava = { usuario: string; clave: string };

export type CedenteOctava = {
  rut: string;
  razonSocial: string;
  direccion: string;
  email: string;
  contactoNombre: string;
  contactoEmail: string;
};

export interface AlmacenSesionOctava {
  leerToken(): Promise<{ token: string; expiraEn: number } | null>;
  guardarToken(t: { token: string; expiraEn: number } | null): Promise<void>;
}

export type DepsSesion = {
  cliente: ClienteOctava;
  acceso: CredencialesOctava;
  cedente: CedenteOctava;
  almacen: AlmacenSesionOctava;
  ahora: () => number;
};

export const TOKEN_TTL_MS = 5.5 * 60 * 60 * 1000; // margen frente a las 6 h reales
export const ambienteOctava = (a: "certificacion" | "produccion"): OctavaAmbiente => (a === "produccion" ? "1" : "0");

export function formatoRutOctava(raw: string): string {
  const limpio = raw.replace(/[.\-\s]/g, "").toUpperCase();
  return limpio.length < 2 ? raw.trim() : `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

export function limitarTexto(valor: string | undefined, max: number, respaldo: string): string {
  const limpio = [...(valor ?? "")].map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? " " : c)).join("");
  const t = limpio.trim() || respaldo;
  return t.slice(0, max);
}

export async function asegurarToken(d: DepsSesion, forzar = false): Promise<string> {
  const previo = await d.almacen.leerToken();
  if (!forzar && previo && previo.expiraEn > d.ahora() + 60_000) return previo.token;
  const res = await d.cliente.obtenerToken({
    RUTACCESOAPI: formatoRutOctava(d.acceso.usuario),
    PASSWORDACCESOAPI: d.acceso.clave,
  });
  const token = sinNull(res.Token);
  const ok = res.DescripcionResultado === "TOK" || res.DescripcionResultado === "TDUP";
  if (token && ok) {
    await d.almacen.guardarToken({ token, expiraEn: d.ahora() + TOKEN_TTL_MS });
    return token;
  }
  // TDUP sin token nuevo: Octava no devuelve el activo; si aún lo tenemos, se reutiliza.
  if (res.DescripcionResultado === "TDUP" && previo && !forzar) return previo.token;
  throw new Error(`Octava ObtenerToken falló (${res.DescripcionResultado ?? "?"}): ${res.message ?? "sin mensaje"}`);
}
