import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto } from "../../errores";
import { executeCapability } from "../../execute";
import type { Contexto } from "../../types";
import { requierePlataforma } from "../comun";
import { uuidSchema } from "../esquemas";
import { pendiente } from "./aprobaciones-pendiente";

// Resolución de la cola de plataforma (CAR-36). Son capacidades `platform.*` sin empresa: su
// auditoría va solo a la auditoría global (nunca a la cadena de la empresa de quien aprueba, que
// vería el id y el motivo) y se pueden resolver sin elegir empresa.

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;

/** Pasa de pendiente al estado final en la transacción de la capacidad (con su auditoría). */
async function decidir(
  ctx: Contexto,
  id: string,
  datos: { estado: "aprobada" | "rechazada"; motivo?: string },
) {
  const g = requierePlataforma(ctx).globales;
  const resueltaPor = ctx.actor.id ?? null;
  const n = await ctx.transaccion((tx) =>
    g.resolverAprobacionPlataforma(id, { ...datos, resueltaPor }, tx),
  );
  if (n !== 1) throw conflicto("Otra persona resolvió la aprobación al mismo tiempo.");
}

export const platformAprobacionesAprobar = defineCapability({
  id: "platform.aprobaciones.aprobar",
  // Solo personas: lo irreversible lo aprueba un humano (ADR-032), también en plataforma.
  soloPersonas: true,
  descripcion:
    "Plataforma · IRREVERSIBLE: aprueba una acción de plataforma pedida por un agente y la ejecuta en el acto como la persona que aprueba (con sus permisos de plataforma).",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  portales: ["platform", "erp"],
  input: z.object({ id: uuidSchema }),
  output: z.object({ estado: z.string(), resultado: z.unknown() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { a } = await pendiente(ctx, input.id, true, "plataforma");
    if (dryRun)
      return {
        estado: "pendiente",
        resultado: await executeCapability(ctx, a.capability, a.input, { dryRun: true }),
      };
    await decidir(ctx, a.id, { estado: "aprobada" });
    // Sin clave de idempotencia: la reserva guardaría el input en una empresa; el paso
    // pendiente → aprobada ya garantiza una sola ejecución.
    const resultado = await executeCapability(ctx, a.capability, a.input, {
      auditoriaExtra: { aprobacionId: a.id, apiKeyId: a.apiKeyId },
    });
    await ctx.transaccion((tx) =>
      requierePlataforma(ctx).globales.guardarResultadoAprobacionPlataforma(
        a.id,
        json(resultado),
        tx,
      ),
    );
    return { estado: "aprobada", resultado };
  },
});

export const platformAprobacionesRechazar = defineCapability({
  id: "platform.aprobaciones.rechazar",
  // Solo personas: la decisión sobre lo irreversible es humana (ADR-032).
  soloPersonas: true,
  descripcion:
    "Plataforma: rechaza una acción de plataforma pedida por un agente, con motivo. No se ejecuta nada y el agente lo ve al consultar la aprobación.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  portales: ["platform", "erp"],
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(3).max(500) }),
  output: z.object({ estado: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { a } = await pendiente(ctx, input.id, false, "plataforma");
    if (dryRun) return { estado: "pendiente" };
    await decidir(ctx, a.id, { estado: "rechazada", motivo: input.motivo });
    return { estado: "rechazada" };
  },
});
