import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { obtenerCapacidad } from "../../registry";
import type { Contexto } from "../../types";
import { iso } from "../comun";
import { uuidSchema } from "../esquemas";

const usdAMicro = (usd: number) => BigInt(Math.round(usd * 1_000_000));

async function keyDe(ctx: Contexto, id: string) {
  const k = await ctx.db.apiKey.findUnique({ where: { id } });
  if (!k) throw noEncontrado("La API key");
  return k;
}

export const apikeysUpdate = defineCapability({
  id: "core.apikeys.update",
  // Solo personas: renombrar o cambiar los alcances de una key es gobernar agentes (ADR-032); una key no se modifica a sí misma ni a otra.
  soloPersonas: true,
  descripcion:
    "Cambia el nombre, la expiración o el presupuesto mensual en USD de una API key (el presupuesto exige permiso de agentes; null lo quita).",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(2).max(60).optional(),
    expiraEn: z.iso.datetime({ offset: true }).nullable().optional(),
    presupuestoMensualUsd: z
      .number()
      .min(0)
      .max(100_000)
      .multipleOf(0.000001)
      .nullable()
      .optional(),
  }),
  output: z.object({
    id: z.string(),
    nombre: z.string(),
    expiraEn: z.string().nullable(),
    presupuestoMensualUsd: z.number().nullable(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const k = await keyDe(ctx, input.id);
    if (input.presupuestoMensualUsd !== undefined && !ctx.autorizar(PERMISOS_CORE.agentesManage)) {
      throw prohibido("Cambiar el presupuesto de un agente requiere el permiso de agentes.");
    }
    const expiraEn =
      input.expiraEn === undefined ? k.expiraEn : input.expiraEn ? new Date(input.expiraEn) : null;
    if (expiraEn && input.expiraEn && expiraEn.getTime() <= Date.now())
      throw reglaDeNegocio("La expiración debe ser futura.");
    const presupuesto =
      input.presupuestoMensualUsd === undefined
        ? k.presupuestoMensualMicro
        : input.presupuestoMensualUsd === null
          ? null
          : usdAMicro(input.presupuestoMensualUsd);
    const data = {
      nombre: input.nombre ?? k.nombre,
      expiraEn,
      presupuestoMensualMicro: presupuesto,
    };
    if (k.principalTipo === "servicio" && (presupuesto === null || presupuesto <= 0n)) {
      throw reglaDeNegocio("Un agente de servicio exige un presupuesto mensual mayor que cero.");
    }
    const r = dryRun
      ? { ...k, ...data }
      : await ctx.db.apiKey.update({ where: { id: k.id }, data });
    return {
      id: r.id,
      nombre: r.nombre,
      expiraEn: iso(r.expiraEn),
      presupuestoMensualUsd:
        r.presupuestoMensualMicro === null ? null : Number(r.presupuestoMensualMicro) / 1_000_000,
    };
  },
});

export const apikeysSetAutonomia = defineCapability({
  id: "core.apikeys.set_autonomia",
  // Solo personas: la autonomía define qué puede hacer un agente sin aprobación (ADR-032); no puede otorgársela él mismo.
  soloPersonas: true,
  descripcion:
    "Fija la autonomía de un agente para una capacidad que escribe: 'directo' (ejecuta sin pedir) o 'aprobacion' (pide aprobación humana); null vuelve al defecto (lo irreversible se aprueba). 'directo' solo lo da owner o admin.",
  permiso: PERMISOS_CORE.agentesManage,
  input: z.object({
    apiKeyId: uuidSchema,
    capability: z.string(),
    nivel: z.enum(["directo", "aprobacion"]).nullable(),
  }),
  output: z.object({ apiKeyId: z.string(), capability: z.string(), nivel: z.string().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await keyDe(ctx, input.apiKeyId);
    const c = obtenerCapacidad(input.capability);
    if (!c) throw noEncontrado(`La capacidad "${input.capability}"`);
    if (c.efecto === "lectura") throw reglaDeNegocio("Las lecturas no requieren autonomía.");
    if (input.nivel === "directo" && ctx.rol !== "owner" && ctx.rol !== "admin")
      throw prohibido("Solo owner o admin dan autonomía directa.");
    const salida = { apiKeyId: input.apiKeyId, capability: c.id, nivel: input.nivel };
    if (dryRun) return salida;
    const clave = { tenantId: ctx.tenantId, apiKeyId: input.apiKeyId, capability: c.id };
    await ctx.transaccion(async (tx) => {
      if (input.nivel === null) await tx.apiKeyAutonomia.deleteMany({ where: clave });
      else {
        await tx.apiKeyAutonomia.upsert({
          where: { tenantId_apiKeyId_capability: clave },
          create: { ...clave, nivel: input.nivel },
          update: { nivel: input.nivel },
        });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "core.agente.autonomia_cambiada",
        entidadTipo: "api_key",
        entidadId: input.apiKeyId,
        payload: { capability: c.id, nivel: input.nivel },
      });
    });
    return salida;
  },
});
