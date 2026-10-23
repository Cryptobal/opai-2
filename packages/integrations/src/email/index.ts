import { mailerConsola } from "./consola";
import type { Mailer } from "./mailer";
import { mailerResend } from "./resend";

export { mailerConsola } from "./consola";
export type { Correo, Mailer } from "./mailer";
export { mailerResend } from "./resend";

/** Resend si hay `RESEND_API_KEY`; si no, consola (desarrollo). */
export function mailerDelEntorno(env: Record<string, string | undefined> = process.env): Mailer {
  const apiKey = env["RESEND_API_KEY"];
  if (!apiKey) return mailerConsola();
  return mailerResend(apiKey, env["EMAIL_FROM"] ?? "OPAI <no-reply@opai.cl>");
}
