import { z } from "zod";

import { PERMISOS_CORE, PORTALES_VER_COMO, VER_COMO_MINUTOS } from "@opai/domain";
import type { EventoVerComo } from "@opai/db";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { objetivoVerComo } from "./objetivo";

const vistaInput = z.object({ portal: z.enum(PORTALES_VER_COMO), objetivoId: uuidSchema });

function quienMira(ctx: Contexto): string {
  if (ctx.actor.tipo !== "user")
    throw prohibido("Solo una persona con sesión puede usar «ver como».");
  return ctx.actor.id;
}

/** Hecho de la cadena `seguridad`: quién mira, a quién, qué portal y objetivo. Solo ids, sin datos personales. */
function hecho(
  ctx: Contexto,
  tipo: EventoVerComo["tipo"],
  userId: string | null,
  detalle: Record<string, string | null>,
): EventoVerComo {
  return {
    tipo,
    userId,
    porUserId: quienMira(ctx),
    tenantId: ctx.tenantId,
    detalle,
    ipHmac: null,
    userAgent: null,
  };
}

export const verComoIniciar = defineCapability({
  id: "core.ver_como.iniciar",
  soloPersonas: true,
  descripcion: `Solo personas: empieza a ver un portal (Terreno, trabajador, cliente o supervisor) como otra persona o instalación de la empresa, en solo lectura y por ${VER_COMO_MINUTOS} minutos. Queda en la auditoría de seguridad. Acepta vista previa.`,
  permiso: PERMISOS_CORE.verComoIniciar,
  input: vistaInput,
  output: vistaInput.extend({
    nombre: z.string(),
    userId: z.string().nullable(),
    personaId: z.string().nullable(),
    dispositivoId: z.string().nullable(),
    expiraEn: z.string(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const o = await objetivoVerComo(ctx, input.portal, input.objetivoId, quienMira(ctx));
    const expiraEn = new Date(Date.now() + VER_COMO_MINUTOS * 60_000).toISOString();
    if (!dryRun) {
      const detalle = { ...input, dispositivoId: o.dispositivoId, expiraEn };
      await ctx.transaccion((tx) =>
        ctx.identidad.registrarVerComo(
          tx,
          hecho(ctx, "seguridad.ver_como.inicio", o.userId, detalle),
        ),
      );
    }
    return { ...input, ...o, expiraEn };
  },
});

export const verComoTerminar = defineCapability({
  id: "core.ver_como.terminar",
  soloPersonas: true,
  descripcion:
    "Solo personas: termina la vista «ver como» de un portal y lo deja en la auditoría de seguridad. Acepta vista previa.",
  permiso: PERMISOS_CORE.verComoIniciar,
  input: vistaInput,
  output: z.object({ terminado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!dryRun)
      await ctx.transaccion((tx) =>
        ctx.identidad.registrarVerComo(tx, hecho(ctx, "seguridad.ver_como.fin", null, input)),
      );
    return { terminado: !dryRun };
  },
});
