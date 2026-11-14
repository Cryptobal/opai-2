import type { Correo, Mailer } from "./mailer";
import { ErrorDeProveedor } from "../error-con-motivo";

/** Adaptador Resend por HTTP (sin SDK): una sola llamada, sin dependencias. */
export function mailerResend(apiKey: string, remitente: string): Mailer {
  return {
    nombre: "resend",
    async enviar(correo: Correo) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: remitente,
          to: [correo.para, ...(correo.paraAdicionales ?? [])],
          subject: correo.asunto,
          text: correo.texto,
          ...(correo.html ? { html: correo.html } : {}),
          ...(correo.cc?.length ? { cc: correo.cc } : {}),
          ...(correo.bcc?.length ? { bcc: correo.bcc } : {}),
          ...(correo.adjuntos?.length
            ? {
                attachments: correo.adjuntos.map((a) => ({
                  filename: a.nombre,
                  content: a.contenidoBase64,
                })),
              }
            : {}),
          ...(correo.responderA?.length ? { reply_to: correo.responderA } : {}),
        }),
      });
      if (!res.ok) {
        // Sin el asunto: el motivo va al log y no debe llevar datos del correo.
        throw new ErrorDeProveedor(`Resend respondió ${res.status} al enviar el correo.`);
      }
    },
  };
}
