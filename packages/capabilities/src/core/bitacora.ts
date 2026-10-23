import { z } from "zod";

import { PERMISOS_CORE, PERMISOS_PLATAFORMA } from "@opai/domain";
import { consolidarConsumos } from "@opai/db";

import { defineCapability } from "../define";
import { defineTrabajo } from "../trabajos/registro";
import { iso, requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";

const verificacionSchema = z.object({
  ok: z.boolean(),
  ultimoSeq: z.number(),
  primeraRota: z.number().nullable(),
});

export const bitacoraVerificar = defineCapability({
  id: "core.bitacora.verificar",
  descripcion:
    "Verifica la integridad de la bitácora encadenada de la empresa (ADR-023): recorre los hechos y devuelve si la cadena está intacta o el primer eslabón roto.",
  permiso: PERMISOS_CORE.auditRead,
  input: z.object({}),
  output: verificacionSchema,
  efecto: "lectura",
  dryRun: false,
  handler: (ctx) => ctx.bitacora.verificar(),
});

export const platformBitacoraEstado = defineCapability({
  id: "platform.bitacora.estado",
  descripcion:
    "Plataforma: estado de la bitácora encadenada de una empresa: último hecho, última verificación y su resultado.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: z.object({
    ultimoSeq: z.number(),
    verificadaEn: z.string().nullable(),
    verificacionOk: z.boolean().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const db = requierePlataforma(ctx).paraTenant(input.tenantId);
    const c = await db.bitacoraCabeza.findUnique({ where: { tenantId: input.tenantId } });
    return {
      ultimoSeq: c?.ultimoSeq ?? 0,
      verificadaEn: iso(c?.verificadaEn),
      verificacionOk: c?.verificacionOk ?? null,
    };
  },
});

const dia = z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** Verificación diaria de la cadena; si se rompe, emite `core.bitacora.rota` (ADR-023). */
export const trabajoVerificarBitacora = defineTrabajo({
  tipo: "core.bitacora.verificar",
  descripcion: "Verifica a diario la bitácora encadenada del tenant.",
  payload: dia,
  periodicidad: "diaria",
  async handler(ctx) {
    const r = await ctx.bitacora.verificar();
    if (!r.ok) {
      await ctx.transaccion((tx) =>
        ctx.eventos.emitir(tx, { tipo: "core.bitacora.rota", payload: r }),
      );
    }
    return r;
  },
});

/** Consolida los consumos del día anterior y purga los crudos vencidos (ADR-031). */
export const trabajoConsolidarConsumos = defineTrabajo({
  tipo: "core.consumos.consolidar",
  descripcion: "Consolida a diario los consumos del día anterior.",
  payload: dia,
  periodicidad: "diaria",
  handler(ctx, { dia: hoy }) {
    const ayer = new Date(Date.parse(`${hoy}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    return consolidarConsumos(ctx.tenantId, ayer);
  },
});

export const trabajosDelNucleo = [trabajoVerificarBitacora, trabajoConsolidarConsumos];
