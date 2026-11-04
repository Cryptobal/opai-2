import { mailerConsola, mailerNoConfigurado } from "./consola";
import { entornoDesplegado } from "./entorno";
import type { Mailer } from "./mailer";
import { mailerResend } from "./resend";

export {
  CorreoNoConfigurado,
  mailerConsola,
  mailerNoConfigurado,
  ocultarDestinatario,
  ocultarTokens,
} from "./consola";
export { entornoDesplegado } from "./entorno";
export type { AdjuntoCorreo, Correo, Mailer } from "./mailer";
export { mailerResend } from "./resend";

/**
 * Resend si hay `RESEND_API_KEY`. Sin ella: en un entorno desplegado, un mailer que falla cerrado al
 * enviar (no al construir el contexto, para no tumbar lo que no manda correo); en desarrollo, la
 * consola sin destinatario completo ni tokens (CAR-51).
 */
export function mailerDelEntorno(env: Record<string, string | undefined> = process.env): Mailer {
  const apiKey = env["RESEND_API_KEY"];
  if (apiKey) return mailerResend(apiKey, env["EMAIL_FROM"] ?? "OPAI <no-reply@opai.cl>");
  return entornoDesplegado(env) ? mailerNoConfigurado() : mailerConsola(console.info, env);
}
