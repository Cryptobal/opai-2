import { z } from "zod";

import { endpointPushValido } from "@opai/integrations";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

const PORTALES = ["erp", "supervisor", "trabajador", "terreno"] as const;

const endpointSchema = z
  .url({ protocol: /^https$/ })
  .max(1000)
  .refine(endpointPushValido, "No es el endpoint de un servicio de push de un navegador.")
  .describe("Endpoint que entrega el navegador al suscribirse (PushSubscription.endpoint).");

function usuarioDe(ctx: Contexto): string {
  if (ctx.actor.tipo !== "user")
    throw reglaDeNegocio("El aviso al celular es de usuarios con sesión.");
  return ctx.actor.id;
}

/**
 * Suscribe el dispositivo actual del usuario a los avisos al celular (CAR-356 PR 4a, ADR-044.4). Lo pide el
 * navegador del propio usuario después de dar permiso; un agente no tiene dispositivo (solo personas).
 * Idempotente por endpoint: volver a suscribir actualiza el dueño y el nombre del dispositivo.
 */
export const pushSuscribir = defineCapability({
  id: "core.push.suscribir",
  // Solo personas: la suscripción es del navegador de quien tiene la sesión; un agente no tiene celular.
  soloPersonas: true,
  // El endpoint identifica el dispositivo: no se copia a la auditoría.
  sensibles: ["endpoint"],
  descripcion:
    "Activa los avisos al celular en este dispositivo: guarda la suscripción de Web Push del navegador del usuario. Los avisos llegan sin contenido y abren el portal.",
  permiso: null,
  portales: [...PORTALES],
  input: z.object({ endpoint: endpointSchema, dispositivo: z.string().trim().max(120).optional() }),
  output: z.object({ suscrito: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const usuarioId = usuarioDe(ctx);
    if (!dryRun) {
      await ctx.db.suscripcionPush.upsert({
        where: { tenantId_endpoint: { tenantId: ctx.tenantId, endpoint: input.endpoint } },
        create: {
          tenantId: ctx.tenantId,
          usuarioId,
          endpoint: input.endpoint,
          dispositivo: input.dispositivo ?? null,
        },
        update: { usuarioId, dispositivo: input.dispositivo ?? null },
      });
    }
    return { suscrito: true };
  },
});

/** Quita la suscripción de este dispositivo (solo si es del propio usuario). */
export const pushQuitar = defineCapability({
  id: "core.push.quitar",
  // Solo personas, como suscribir: el dispositivo es de quien tiene la sesión.
  soloPersonas: true,
  // El endpoint identifica el dispositivo: no se copia a la auditoría.
  sensibles: ["endpoint"],
  descripcion:
    "Apaga los avisos al celular en este dispositivo: borra la suscripción de Web Push del usuario.",
  permiso: null,
  portales: [...PORTALES],
  input: z.object({ endpoint: endpointSchema }),
  output: z.object({ quitadas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const where = { usuarioId: usuarioDe(ctx), endpoint: input.endpoint };
    if (dryRun) return { quitadas: await ctx.db.suscripcionPush.count({ where }) };
    const r = await ctx.db.suscripcionPush.deleteMany({ where });
    return { quitadas: r.count };
  },
});

export const capacidadesPush = [pushSuscribir, pushQuitar];
