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

const tokenNativoSchema = z
  .string()
  .trim()
  .min(20)
  .max(4096)
  .regex(/^[A-Za-z0-9_:\-]+$/, "Token FCM/APNs inválido.");

function usuarioDe(ctx: Contexto): string {
  if (ctx.actor.tipo !== "user")
    throw reglaDeNegocio("El aviso al celular es de usuarios con sesión.");
  return ctx.actor.id;
}

const inputSuscribir = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("web"),
    endpoint: endpointSchema,
    dispositivo: z.string().trim().max(120).optional(),
  }),
  z.object({
    tipo: z.literal("nativa"),
    token: tokenNativoSchema,
    plataforma: z.enum(["ios", "android"]),
    dispositivo: z.string().trim().max(120).optional(),
  }),
]);

const inputQuitar = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("web"), endpoint: endpointSchema }),
  z.object({ tipo: z.literal("nativa"), token: tokenNativoSchema }),
]);

/**
 * Suscribe el dispositivo actual del usuario a los avisos al celular (CAR-356 PR 4a, ADR-044.4). Lo pide el
 * navegador del propio usuario después de dar permiso; un agente no tiene dispositivo (solo personas).
 * Idempotente por endpoint o token: volver a suscribir actualiza el dueño y el nombre del dispositivo.
 */
const pushSuscribir = defineCapability({
  id: "core.push.suscribir",
  soloPersonas: true,
  sensibles: ["endpoint", "token"],
  descripcion:
    "Activa los avisos al celular en este dispositivo: guarda la suscripción Web Push del navegador o el token nativo de la app.",
  permiso: null,
  portales: [...PORTALES],
  input: inputSuscribir,
  output: z.object({ suscrito: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const usuarioId = usuarioDe(ctx);
    if (dryRun) return { suscrito: true };
    if (input.tipo === "web") {
      await ctx.db.suscripcionPush.upsert({
        where: { tenantId_endpoint: { tenantId: ctx.tenantId, endpoint: input.endpoint } },
        create: {
          tenantId: ctx.tenantId,
          usuarioId,
          tipo: "web",
          endpoint: input.endpoint,
          dispositivo: input.dispositivo ?? null,
        },
        update: { usuarioId, dispositivo: input.dispositivo ?? null, tipo: "web" },
      });
      return { suscrito: true };
    }
    await ctx.db.suscripcionPush.upsert({
      where: { tenantId_token: { tenantId: ctx.tenantId, token: input.token } },
      create: {
        tenantId: ctx.tenantId,
        usuarioId,
        tipo: "nativa",
        token: input.token,
        plataforma: input.plataforma,
        dispositivo: input.dispositivo ?? null,
      },
      update: {
        usuarioId,
        plataforma: input.plataforma,
        dispositivo: input.dispositivo ?? null,
        tipo: "nativa",
      },
    });
    return { suscrito: true };
  },
});

/** Quita la suscripción de este dispositivo (solo si es del propio usuario). */
const pushQuitar = defineCapability({
  id: "core.push.quitar",
  soloPersonas: true,
  sensibles: ["endpoint", "token"],
  descripcion: "Apaga los avisos al celular en este dispositivo: borra la suscripción Web Push o nativa del usuario.",
  permiso: null,
  portales: [...PORTALES],
  input: inputQuitar,
  output: z.object({ quitadas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const usuarioId = usuarioDe(ctx);
    if (input.tipo === "web") {
      const where = { usuarioId, endpoint: input.endpoint, tipo: "web" as const };
      if (dryRun) return { quitadas: await ctx.db.suscripcionPush.count({ where }) };
      const r = await ctx.db.suscripcionPush.deleteMany({ where });
      return { quitadas: r.count };
    }
    const where = { usuarioId, token: input.token, tipo: "nativa" as const };
    if (dryRun) return { quitadas: await ctx.db.suscripcionPush.count({ where }) };
    const r = await ctx.db.suscripcionPush.deleteMany({ where });
    return { quitadas: r.count };
  },
});

export const capacidadesPush = [pushSuscribir, pushQuitar];