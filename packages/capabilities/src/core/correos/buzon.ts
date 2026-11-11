// Dirección de registro de la empresa (CAR-233): `t<token>@respuestas.opai.cl`. Va como reply-to en los
// correos que salen de OPAI y el vendedor la pone en CCO cuando escribe desde su casilla.
import { PERMISOS_CORE } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { PERMISO_HISTORIAL, asegurarBuzon, direccionDelBuzon, tokenDelBuzon } from "./comun";

const salida = z.object({
  direccion: z.string().nullable().describe("Dirección para CCO; null si la empresa todavía no la tiene (se crea con core.correos.crear_direccion o con el primer envío)."),
});

export const correosDireccion = defineCapability({
  id: "core.correos.direccion",
  descripcion:
    "Dirección de registro de correos de la empresa: el vendedor la pone en copia oculta (CCO) al escribirle a un cliente desde su casilla y el correo queda en el historial de la ficha. También es el reply-to de los correos que salen de OPAI.",
  permiso: PERMISO_HISTORIAL,
  portales: ["erp"],
  input: z.object({}),
  output: salida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const token = await tokenDelBuzon(ctx.db);
    return { direccion: token ? direccionDelBuzon(token) : null };
  },
});

export const correosCrearDireccion = defineCapability({
  id: "core.correos.crear_direccion",
  descripcion:
    "Crea la dirección de registro de correos de la empresa si todavía no existe (una por empresa, con un identificador aleatorio que no se adivina). Si ya existe, la devuelve sin cambiarla.",
  permiso: PERMISOS_CORE.actividadesManage,
  portales: ["erp"],
  input: z.object({}),
  output: z.object({ direccion: z.string().nullable(), creada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _input, { dryRun }) {
    const previo = await tokenDelBuzon(ctx.db);
    if (previo) return { direccion: direccionDelBuzon(previo), creada: false };
    if (dryRun) return { direccion: null, creada: true };
    const token = await ctx.transaccion((tx) => asegurarBuzon(tx, ctx.tenantId));
    return { direccion: direccionDelBuzon(token), creada: true };
  },
});
