import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import { cambios, frase } from "./actividad-texto";

const TIPOS = ["cuenta", "instalacion", "persona", "cargo", "documento"] as const;
const PERMISO_LECTURA: Record<(typeof TIPOS)[number], string> = {
  cuenta: PERMISOS_CORE.cuentasRead,
  instalacion: PERMISOS_CORE.instalacionesRead,
  persona: PERMISOS_CORE.personasRead,
  cargo: PERMISOS_CORE.estructurasRead,
  documento: PERMISOS_CORE.documentosRead,
};

const itemSchema = z.object({
  id: z.string(),
  cuando: z.string(),
  capability: z.string(),
  actor: z.object({ tipo: z.string(), nombre: z.string(), agente: z.boolean() }),
  via: z.string().nullable().describe("Usuario responsable cuando actuó un agente."),
  accion: z.string().describe('Frase legible: "creó el contacto Paula Riquelme".'),
  cambios: z.array(z.object({ campo: z.string(), valor: z.string() })),
  detalle: z.unknown().describe("Input auditado (sin datos sensibles)."),
});

async function nombres(ctx: Contexto, usuarios: string[], keys: string[]) {
  const [m, k] = await Promise.all([
    ctx.db.membership.findMany({ where: { userId: { in: usuarios } }, include: { user: true } }),
    ctx.db.apiKey.findMany({ where: { id: { in: keys } }, select: { id: true, nombre: true } }),
  ]);
  return new Map([
    ...m.map((x) => [x.userId, x.user.name] as const),
    ...k.map((x) => [x.id, x.nombre] as const),
  ]);
}

export const actividadList = defineCapability({
  id: "core.actividad.list",
  descripcion:
    "Actividad (historial) de una ficha —cuenta, instalación, persona, cargo o documento— o de toda la empresa: quién hizo qué y cuándo, distinguiendo personas y agentes, con los campos cambiados.",
  permiso: null,
  input: z.object({
    entidad: z
      .object({ tipo: z.enum(TIPOS), id: z.uuid() })
      .optional()
      .describe("Sin entidad: toda la empresa (exige auditoría)."),
    actor: z.enum(["persona", "agente"]).optional(),
    limite: z.number().int().min(1).max(100).default(30),
    cursor: z.uuid().optional(),
  }),
  output: z.object({ items: z.array(itemSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const e = input.entidad;
    if (!ctx.autorizar(e ? PERMISO_LECTURA[e.tipo] : PERMISOS_CORE.auditRead))
      throw prohibido("No tienes acceso a esta actividad.");
    const campo = e ? `${e.tipo}Id` : "";
    const filas = await ctx.db.auditEvent.findMany({
      where: {
        ...(e
          ? {
              OR: [
                { entityType: e.tipo, entityId: e.id },
                { payload: { path: ["input", campo], equals: e.id } },
                { payload: { path: ["input", "entidad", "id"], equals: e.id } },
              ],
            }
          : {}),
        ...(input.actor ? { actorType: input.actor === "agente" ? "agent" : "user" } : {}),
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const pagina = filas.slice(0, input.limite);
    const quien = await nombres(
      ctx,
      pagina
        .flatMap((f) => [f.actorType === "user" ? f.actorId : null, f.viaUserId])
        .filter((x): x is string => !!x),
      pagina.filter((f) => f.actorType === "agent" && f.actorId).map((f) => f.actorId as string),
    );
    return {
      items: pagina.map((f) => {
        const payload = (f.payload ?? {}) as { input?: Record<string, unknown> };
        const entrada = payload.input ?? {};
        const agente = f.actorType === "agent";
        return {
          id: f.id,
          cuando: f.createdAt.toISOString(),
          capability: f.capability,
          actor: {
            tipo: f.actorType,
            nombre:
              quien.get(f.actorId ?? "") ??
              (agente ? "Agente" : f.actorType === "system" ? "OPAI" : "Usuario"),
            agente,
          },
          via: f.viaUserId ? (quien.get(f.viaUserId) ?? null) : null,
          accion: frase(f.capability, entrada),
          cambios: cambios(entrada),
          detalle: entrada,
        };
      }),
      siguiente: filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  },
});
