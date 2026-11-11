import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { duenoDeMetodos, exigeSegundoFactor, origenDe } from "./comun";

const AVISO_SIN_FACTOR =
  "Tu cuenta queda solo con contraseña: si alguien la obtiene, puede entrar. Te recomendamos mantener al menos una passkey o la app autenticadora.";

const inputSchema = z.discriminatedUnion("metodo", [
  z.object({ metodo: z.literal("passkey"), id: z.uuid() }),
  z.object({ metodo: z.literal("app_autenticadora") }),
]);

/**
 * Quita uno de mis métodos (CAR-286). Irreversible y solo personas. La persona debe haber confirmado su identidad hace menos de 5 minutos (contraseña, código o
 * passkey vigente, en Mi cuenta › Seguridad): la marca se consume aquí, en la misma transacción que
 * el cambio y su auditoría. Si queda sin segundo factor se avisa, sin bloquear; las cuentas de
 * plataforma no pueden quedar sin él.
 */
export const seguridadMetodosQuitar = defineCapability({
  id: "core.metodos_acceso.quitar",
  // Solo personas: gobierna las credenciales propias (REGLAS-codigo). Por aprobación correría como
  // quien aprueba (sobre SUS métodos) y un agente no puede confirmar la identidad de la persona.
  soloPersonas: true,
  descripcion:
    "IRREVERSIBLE · solo personas: quita una de mis passkeys o desactiva mi app autenticadora. Requiere haber confirmado mi identidad (contraseña o un método vigente) en los últimos 5 minutos; avisa si mi cuenta queda solo con contraseña.",
  permiso: null,
  portales: ["erp", "supervisor"],
  input: inputSchema,
  output: z.object({
    quitado: z.boolean(),
    conSegundoFactor: z.boolean(),
    aviso: z.string().nullable(),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const userId = duenoDeMetodos(ctx);
    const m = await ctx.identidad.metodosDe(userId);
    const existe = input.metodo === "passkey" ? m.passkeys.some((p) => p.id === input.id) : m.totp;
    if (!existe)
      throw input.metodo === "passkey"
        ? noEncontrado("La passkey")
        : reglaDeNegocio("No tienes la app autenticadora activa.");
    const restantes = (m.totp ? 1 : 0) + m.passkeys.length - 1;
    if (restantes === 0 && exigeSegundoFactor(ctx))
      throw prohibido("Tu cuenta de plataforma requiere al menos un segundo factor.");
    const salida = {
      quitado: !dryRun,
      conSegundoFactor: restantes > 0,
      aviso: restantes > 0 ? null : AVISO_SIN_FACTOR,
    };
    if (dryRun) return salida;
    await ctx.transaccion(async (tx) => {
      if (!(await ctx.identidad.consumirReautenticacion(tx, userId)))
        throw prohibido(
          "Confirma tu identidad (contraseña o un método vigente) en Mi cuenta › Seguridad y vuelve a intentarlo.",
        );
      const o = origenDe(ctx);
      const ok =
        input.metodo === "passkey"
          ? await ctx.identidad.quitarPasskey(tx, userId, input.id, o)
          : await ctx.identidad.desactivarTotp(tx, userId, o);
      if (!ok)
        throw noEncontrado(input.metodo === "passkey" ? "La passkey" : "La app autenticadora");
    });
    return salida;
  },
});
