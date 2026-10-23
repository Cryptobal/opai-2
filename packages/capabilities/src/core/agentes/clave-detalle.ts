import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { listarCapacidades } from "../../registry";
import { keySchema } from "../apikeys";
import { iso } from "../comun";
import { uuidSchema } from "../esquemas";

export const apikeysGet = defineCapability({
  id: "core.apikeys.get",
  descripcion:
    "Ficha de una API key (sin secreto): responsable, scopes, presupuesto mensual y autonomía de cada capacidad irreversible disponible para sus scopes (aprobación humana por defecto o directo).",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ id: uuidSchema }),
  output: keySchema.extend({
    autonomia: z.array(
      z.object({
        capability: z.string(),
        descripcion: z.string(),
        nivel: z.enum(["directo", "aprobacion"]).describe("Por defecto, aprobación."),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const k = await ctx.db.apiKey.findUnique({ where: { id: input.id }, include: { user: true } });
    if (!k) throw noEncontrado("La API key");
    const [miembro, reglas] = await Promise.all([
      ctx.db.membership.findFirst({ where: { userId: k.userId, estado: "activa" } }),
      ctx.db.apiKeyAutonomia.findMany({ where: { apiKeyId: k.id } }),
    ]);
    const nivel = new Map(reglas.map((r) => [r.capability, r.nivel]));
    const todos = k.scopes.includes("*");
    const irreversibles = listarCapacidades().filter(
      (c) =>
        c.efecto === "irreversible" &&
        !c.soloPersonas &&
        !c.interna &&
        c.modulo !== "platform" &&
        (todos || k.scopes.includes(c.modulo)),
    );
    return {
      ...k,
      responsable: { nombre: k.user.name, email: k.user.email },
      ultimoUsoEn: iso(k.ultimoUsoEn),
      expiraEn: iso(k.expiraEn),
      revocadaEn: iso(k.revocadaEn),
      presupuestoMensualUsd: k.presupuestoMensualMicro
        ? Number(k.presupuestoMensualMicro) / 1_000_000
        : null,
      valida:
        !k.revocadaEn && (!k.expiraEn || k.expiraEn.getTime() > Date.now()) && Boolean(miembro),
      autonomia: irreversibles.map((c) => ({
        capability: c.id,
        descripcion: c.descripcion,
        nivel: nivel.get(c.id) === "directo" ? ("directo" as const) : ("aprobacion" as const),
      })),
    };
  },
});
