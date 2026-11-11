import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { duenoDeMetodos, exigeSegundoFactor, origenDe } from "./comun";

const passkeySchema = z.object({
  id: z.string(),
  nombre: z.string().nullable(),
  creadaEn: z.string().nullable(),
  sincronizada: z.boolean(),
});

export const metodosSchema = z.object({
  appAutenticadora: z.boolean(),
  passkeys: z.array(passkeySchema),
  tieneContrasena: z.boolean(),
  /** Tiene al menos un segundo factor (app autenticadora o passkey). */
  conSegundoFactor: z.boolean(),
  /** Su cuenta exige segundo factor (hoy solo plataforma). */
  segundoFactorObligatorio: z.boolean(),
});

/**
 * Métodos de acceso propios (CAR-286). Solo metadatos: nunca la clave pública ni el id de credencial
 * de la passkey, ni el secreto o los códigos de la app autenticadora.
 */
export const seguridadMetodos = defineCapability({
  id: "core.metodos_acceso.list",
  descripcion:
    "Mis métodos de acceso: si tengo app autenticadora (códigos de 6 dígitos), mis passkeys (Face ID, huella o llave) con su nombre y fecha, y si mi cuenta queda sin segundo factor. No revela secretos.",
  permiso: null,
  portales: ["erp", "supervisor"],
  input: z.object({}),
  output: metodosSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const m = await ctx.identidad.metodosDe(duenoDeMetodos(ctx));
    return {
      appAutenticadora: m.totp,
      passkeys: m.passkeys.map((p) => ({ ...p, creadaEn: p.creadaEn?.toISOString() ?? null })),
      tieneContrasena: m.tienePassword,
      conSegundoFactor: m.totp || m.passkeys.length > 0,
      segundoFactorObligatorio: exigeSegundoFactor(ctx),
    };
  },
});

export const seguridadPasskeysRenombrar = defineCapability({
  id: "core.metodos_acceso.renombrar_passkey",
  descripcion:
    "Cambia el nombre de una de mis passkeys (por ejemplo «iPhone de trabajo») para reconocerla en la lista. No cambia cómo se entra.",
  permiso: null,
  portales: ["erp", "supervisor"],
  input: z.object({ id: z.uuid(), nombre: z.string().trim().min(1).max(60) }),
  output: z.object({ id: z.string(), nombre: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const userId = duenoDeMetodos(ctx);
    const m = await ctx.identidad.metodosDe(userId);
    if (!m.passkeys.some((p) => p.id === input.id)) throw noEncontrado("La passkey");
    if (dryRun) return { id: input.id, nombre: input.nombre };
    const ok = await ctx.transaccion((tx) =>
      ctx.identidad.renombrarPasskey(tx, userId, input.id, input.nombre, origenDe(ctx)),
    );
    if (!ok) throw noEncontrado("La passkey");
    return { id: input.id, nombre: input.nombre };
  },
});
