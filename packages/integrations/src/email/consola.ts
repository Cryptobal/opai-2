import { entornoDesplegado } from "./entorno";
import type { Correo, Mailer } from "./mailer";

/** Tramo con forma de token (≥16 caracteres URL-safe) dentro de una URL: ruta o valor de query. */
const TOKEN = /[A-Za-z0-9_-]{16,}/g;
const ENLACE = /https?:\/\/[^\s"'<>]+/g;

/** `ana.perez@empresa.cl` → `a***@empresa.cl`: sirve para depurar sin escribir el destinatario. */
export function ocultarDestinatario(para: string): string {
  const arroba = para.lastIndexOf("@");
  if (arroba < 1) return "***";
  return `${para[0]}***${para.slice(arroba)}`;
}

/** Reemplaza los tokens de las URLs del texto (enlaces de invitación y recuperación) por `[oculto]`. */
export function ocultarTokens(texto: string): string {
  return texto.replace(ENLACE, (url) => url.replace(TOKEN, "[oculto]"));
}

/**
 * Adaptador de desarrollo: escribe el correo en el log del servidor sin el destinatario completo ni
 * los tokens de sus enlaces (equivalen a una credencial). Nunca escribe en un entorno desplegado
 * (Vercel production/preview o NODE_ENV=production): ahí falla cerrado (CAR-51).
 */
export function mailerConsola(
  log: (linea: string) => void = console.info,
  env: Record<string, string | undefined> = process.env,
): Mailer {
  return {
    nombre: "consola",
    async enviar(correo: Correo) {
      if (entornoDesplegado(env)) throw new CorreoNoConfigurado();
      log(
        `[correo] para=${ocultarDestinatario(correo.para)} asunto="${correo.asunto}"\n${ocultarTokens(correo.texto)}`,
      );
    },
  };
}

/** Error claro y sin datos del correo (ni destinatario ni enlace) para los logs del servidor. */
export class CorreoNoConfigurado extends Error {
  constructor() {
    super("Correo no configurado: falta RESEND_API_KEY en este entorno; no se envió el correo.");
    this.name = "CorreoNoConfigurado";
  }
}

/** Mailer de un entorno desplegado sin proveedor: no envía ni escribe nada, siempre falla. */
export function mailerNoConfigurado(): Mailer {
  return {
    nombre: "no-configurado",
    async enviar() {
      throw new CorreoNoConfigurado();
    },
  };
}
