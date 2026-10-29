// Verificación de la cadena de `core.audit_events` (ADR-052, auditoría del 26-oct-2026 pedida
// por Carlos, t457u). Mismo patrón que `bitacora.ts`, para una cadena distinta (toda escritura,
// no solo los hechos regulados).
import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { defineTrabajo } from "../trabajos/registro";
import { iso, requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";

// La verificación modifica el checkpoint: solo la invoca el trabajo, nunca UI/API/MCP.

export const platformAuditoriaEstado = defineCapability({
  id: "platform.auditoria.estado",
  descripcion:
    "Plataforma: estado de la cadena de auditoría de una empresa: último evento, última verificación y su resultado.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: z.object({
    ultimoSeq: z.number().nullable(),
    verificadaEn: z.string().nullable(),
    verificacionOk: z.boolean().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const c = await requierePlataforma(ctx).empresa(input.tenantId).cabezaAuditoria();
    return {
      ultimoSeq: c?.ultimoSeq ?? null,
      verificadaEn: iso(c?.verificadaEn),
      verificacionOk: c?.verificacionOk ?? null,
    };
  },
});

const dia = z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** Verificación diaria de la cadena; si se rompe, emite `core.auditoria.rota` (ADR-052). */
export const trabajoVerificarAuditoria = defineTrabajo({
  tipo: "core.auditoria.verificar",
  descripcion: "Verifica a diario la cadena de auditoría del tenant.",
  payload: dia,
  periodicidad: "diaria",
  async handler(ctx, _payload, signal) {
    const r = await ctx.auditoria.verificar(signal);
    signal.throwIfAborted();
    if (!r.pausada && !r.ok) {
      await ctx.transaccion(async (tx) => {
        signal.throwIfAborted();
        await ctx.eventos.emitir(tx, { tipo: "core.auditoria.rota", payload: r });
        signal.throwIfAborted();
      });
    }
    return r;
  },
});
