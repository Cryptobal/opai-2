import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

/** Capacidades de __NOMBRE__. Cada una se expone igual en UI, API /api/v1 y MCP (ADR-004). */
export const ping = defineCapability({
  id: "__ID__.ping",
  descripcion: "Comprueba que el módulo __NOMBRE__ está activo para el tenant.",
  permiso: "__ID__:read",
  input: z.object({}),
  output: z.object({ modulo: z.literal("__ID__"), tenantId: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    return { modulo: "__ID__" as const, tenantId: ctx.tenantId };
  },
});

export const capacidades = [ping];
