import { z } from "zod";

import { ESTADOS_SOLICITUD_VIVOS } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { esSuTurno, personaDelUsuario } from "./firmar-util";

const itemSchema = z.object({
  solicitudId: z.string(),
  clase: z.string(),
  nivel: z.string(),
  mensaje: z.string().nullable(),
  plazoVence: z.string(),
  estadoSolicitud: z.string(),
});

const TOPE_ESCANEO = 200;

/**
 * Lo que el usuario autenticado debe firmar en su portal (supervisor o trabajador): solo solicitudes
 * vivas donde es firmante pendiente y le corresponde el turno (R7). Alcance propio (ADR-022).
 */
export const firmasMisPendientes = defineCapability({
  id: "core.firmas.mis_pendientes",
  descripcion:
    "Lista las solicitudes de firma que el usuario autenticado debe firmar en su portal: vivas, con su firma pendiente y su turno de firma, del más próximo a vencer al más lejano.",
  permiso: null,
  soloPersonas: true,
  portales: ["trabajador", "supervisor", "erp", "terreno"],
  input: z.object({
    cursor: z.string().optional().describe("Id de la última solicitud de la página anterior."),
    limite: z.number().int().min(1).max(50).default(50),
  }),
  output: z.object({ items: z.array(itemSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (r) => r.items.map((i) => i.solicitudId),
  async handler(ctx, input) {
    if (ctx.actor.tipo !== "user") throw reglaDeNegocio("Esta lectura requiere un usuario.");
    const personaId = await personaDelUsuario(ctx);
    const filas = await ctx.db.firmante.findMany({
      where: {
        tenantId: ctx.tenantId,
        rol: "firma",
        estado: "pendiente",
        OR: [
          { tipo: "usuario", usuarioId: ctx.actor.id },
          ...(personaId ? [{ personaId }] : []),
        ],
        solicitud: { estado: { in: [...ESTADOS_SOLICITUD_VIVOS] } },
      },
      include: { solicitud: { include: { firmantes: true } } },
      orderBy: { solicitud: { plazoVence: "asc" } },
      take: TOPE_ESCANEO,
    });
    const todos = filas
      .filter((f) => esSuTurno(f.solicitud.orden, f.solicitud.firmantes, f))
      .map((f) => ({
        solicitudId: f.solicitudId,
        clase: f.solicitud.clase,
        nivel: f.solicitud.nivel,
        mensaje: f.solicitud.mensaje,
        plazoVence: f.solicitud.plazoVence.toISOString(),
        estadoSolicitud: f.solicitud.estado,
      }));
    let offset = 0;
    if (input.cursor) {
      const idx = todos.findIndex((i) => i.solicitudId === input.cursor);
      offset = idx >= 0 ? idx + 1 : todos.length;
    }
    const items = todos.slice(offset, offset + input.limite);
    const siguiente =
      items.length === input.limite && offset + input.limite < todos.length
        ? items[items.length - 1]!.solicitudId
        : null;
    return { items, siguiente };
  },
});