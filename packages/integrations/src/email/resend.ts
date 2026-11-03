import type { Correo, Mailer } from "./mailer";

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
          to: [correo.para],
          subject: correo.asunto,
          text: correo.texto,
          ...(correo.html ? { html: correo.html } : {}),
          ...(correo.cc?.length ? { cc: correo.cc } : {}),
          ...(correo.adjuntos?.length
            ? {
                attachments: correo.adjuntos.map((a) => ({
                  filename: a.nombre,
                  content: a.contenidoBase64,
                })),
              }
            : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend respondió ${res.status} al enviar "${correo.asunto}".`);
      }
    },
  };
}
