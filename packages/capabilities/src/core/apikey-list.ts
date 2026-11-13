import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido } from "../errores";
import { keySchema } from "./apikey-schema";
import { iso } from "./comun";

export const apikeysList = defineCapability({
  auditarLectura: (s) => s.map((k) => k.id),
  id: "core.apikeys.list",
  descripcion:
    "API keys de la empresa (sin secretos): nombre, prefijo, scopes, responsable, último uso y validez.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({}),
  output: z.array(keySchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    if (ctx.alcance) throw prohibido("No tienes acceso a estas API keys.");
    const keys = await ctx.db.apiKey.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    const activas = new Set(
      (await ctx.db.membership.findMany({ where: { estado: "activa" } })).map((m) => m.userId),
    );
    const ahora = Date.now();
    return keys.map((k) => ({
      ...k,
      tipo: k.principalTipo ?? "usuario",
      permisos: k.heredaPermisos === false ? k.permisos : null,
      responsable: { nombre: k.user.name, email: k.user.email },
      ultimoUsoEn: iso(k.ultimoUsoEn),
      expiraEn: iso(k.expiraEn),
      revocadaEn: iso(k.revocadaEn),
      presupuestoMensualUsd: k.presupuestoMensualMicro
        ? Number(k.presupuestoMensualMicro) / 1_000_000
        : null,
      scopeAmplio: k.scopes.includes("*"),
      valida:
        !k.revocadaEn && (!k.expiraEn || k.expiraEn.getTime() > ahora) && activas.has(k.userId),
    }));
  },
});
