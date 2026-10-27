// Verificación de la cadena de `core.audit_events` (ADR-023-bis, auditoría del 26-oct-2026 pedida
// por Carlos, t457u). Mismo patrón que `bitacora.ts`, para una cadena distinta (toda escritura,
// no solo los hechos regulados).
import { z } from "zod";

import { PERMISOS_CORE, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { defineTrabajo } from "../trabajos/registro";
import { iso, requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";

const verificacionSchema = z.object({
  ok: z.boolean(),
  ultimoSeq: z.number(),
  primeraRota: z.number().nullable(),
});

export const auditoriaVerificar = defineCapability({
  id: "core.auditoria.verificar",
  descripcion:
    "Verifica la integridad de la cadena de auditoría de la empresa (ADR-023-bis): recorre audit_events y devuelve si la cadena está intacta o el primer eslabón roto.",
  permiso: PERMISOS_CORE.auditRead,
  input: z.object({}),
  output: verificacionSchema,
  efecto: "lectura",
  dryRun: false,
  handler: (ctx) => ctx.auditoria.verificar(),
});

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
    const db = requierePlataforma(ctx).paraTenant(input.tenantId);
    const c = await db.auditoriaCabeza.findUnique({ where: { tenantId: input.tenantId } });
    return {
      ultimoSeq: c?.ultimoSeq ?? null,
      verificadaEn: iso(c?.verificadaEn),
      verificacionOk: c?.verificacionOk ?? null,
    };
  },
});

const dia = z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** Verificación diaria de la cadena; si se rompe, emite `core.auditoria.rota` (ADR-023-bis). */
export const trabajoVerificarAuditoria = defineTrabajo({
  tipo: "core.auditoria.verificar",
  descripcion: "Verifica a diario la cadena de auditoría del tenant.",
  payload: dia,
  periodicidad: "diaria",
  async handler(ctx) {
    const r = await ctx.auditoria.verificar();
    if (!r.ok) {
      await ctx.transaccion((tx) =>
        ctx.eventos.emitir(tx, { tipo: "core.auditoria.rota", payload: r }),
      );
    }
    return r;
  },
});
