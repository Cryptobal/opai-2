import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import {
  cifrarSecreto,
  destinoDe,
  destinoSchema,
  exigeSinAlcance,
  generarSecreto,
  SELECT_DESTINO,
  vistaDestino,
} from "./comun";

export const webhooksDestinoRotar = defineCapability({
  id: "core.webhooks.destino_rotar_secreto",
  soloPersonas: true,
  descripcion:
    "Genera un secreto de firma nuevo para un destino de eventos salientes y lo devuelve UNA sola vez. Desde ese momento los envíos se firman con el nuevo; el anterior deja de valer.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ id: uuidSchema.describe("Id del destino.") }),
  output: destinoSchema.extend({ secreto: z.string().nullable() }),
  salidaIdempotente: (s) => ({ ...s, secreto: null }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeSinAlcance(ctx);
    const actual = await destinoDe(ctx, input.id);
    if (dryRun) return { ...vistaDestino(actual), secreto: null };
    const secreto = generarSecreto();
    const d = await ctx.transaccion(async (tx) =>
      tx.webhookDestino.update({
        where: { id: actual.id },
        data: await cifrarSecreto(ctx, tx, secreto),
        select: SELECT_DESTINO,
      }),
    );
    return { ...vistaDestino(d), secreto };
  },
});

export const webhooksDestinoDelete = defineCapability({
  id: "core.webhooks.destino_eliminar",
  soloPersonas: true,
  descripcion:
    "Elimina un destino de eventos salientes junto con su registro de entregas. Los envíos pendientes se cancelan. Para detenerlo sin perder el registro, se pausa en vez de eliminarlo.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ id: uuidSchema.describe("Id del destino.") }),
  output: z.object({ id: z.string(), url: z.string(), eliminado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeSinAlcance(ctx);
    const actual = await destinoDe(ctx, input.id);
    if (dryRun) return { id: actual.id, url: actual.url, eliminado: false };
    await ctx.db.webhookDestino.delete({ where: { id: actual.id }, select: { id: true } });
    return { id: actual.id, url: actual.url, eliminado: true };
  },
});

export const webhooksDestinoGet = defineCapability({
  id: "core.webhooks.destino_get",
  descripcion:
    "Detalle de un destino de eventos salientes: dirección, eventos suscritos, si está activo y los últimos caracteres de su secreto de firma (el secreto nunca se muestra).",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ id: uuidSchema.describe("Id del destino.") }),
  output: destinoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigeSinAlcance(ctx);
    return vistaDestino(await destinoDe(ctx, input.id));
  },
});
