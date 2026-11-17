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
    limite: z.number().int().min(1).max(50).default(50),
  }),
  output: z.object({ items: z.array(itemSchema) }),
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
      take: input.limite,
    });
    const items = filas
      .filter((f) => esSuTurno(f.solicitud.orden, f.solicitud.firmantes, f))
      .map((f) => ({
        solicitudId: f.solicitudId,
        clase: f.solicitud.clase,
        nivel: f.solicitud.nivel,
        mensaje: f.solicitud.mensaje,
        plazoVence: f.solicitud.plazoVence.toISOString(),
        estadoSolicitud: f.solicitud.estado,
      }));
    return { items };
  },
});