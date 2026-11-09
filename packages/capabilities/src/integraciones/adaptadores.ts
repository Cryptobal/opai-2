import { type Mailer, mailerConsola, mailerResend } from "@opai/integrations";

import type { Contexto } from "../types";
import { consumoBase } from "./consumo-base";
import { credencialDe, integracionDe } from "./resolver";

export { biometriaDe, type BiometriaDeEmpresa } from "./biometria";
export { consumoBase } from "./consumo-base";
export { distanciaDe, geoDe } from "./geo";
export { iaDe } from "./ia";
export { selloDe } from "./sello";

/** Correo del tenant: Resend propio o de plataforma; en desarrollo, consola. Mide cada envío. */
export async function correoDe(
  ctx: Contexto,
  modulo = "core",
): Promise<Mailer & { remitente: string | null }> {
  const cred = await credencialDe(ctx, "resend");
  const fila = await integracionDe(ctx, "resend");
  const config = (fila?.config ?? {}) as { remitente?: string };
  const remitente = config.remitente ?? process.env["EMAIL_FROM"] ?? "OPAI <no-reply@opai.cl>";
  const mailer = cred
    ? mailerResend(cred.valor, remitente)
    : (ctx.servicios.correo ?? mailerConsola());
  return {
    nombre: mailer.nombre,
    remitente: cred ? remitente : null,
    async enviar(c) {
      await mailer.enviar(c);
      const consumo = {
        ...consumoBase(ctx, modulo),
        recurso: "correo.enviado",
        unidad: "correo",
        cantidad: 1,
      };
      // El correo ya salió antes de medirlo: se registra siempre (yaIncurrido), nunca se pierde.
      await ctx.medidor
        .registrar({ ...consumo, sinCosto: cred?.modalidad === "propia", yaIncurrido: true })
        .catch(() => undefined);
    },
  };
}
