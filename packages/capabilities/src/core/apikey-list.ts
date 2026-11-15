import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido } from "../errores";
import { keySchema } from "./apikey-schema";
import { iso } from "./comun";
import { cursorDe, pagina } from "./maestros/comun";

export const apikeysList = defineCapability({
  auditarLectura: (s) => s.items.map((k) => k.id),
  id: "core.apikeys.list",
  descripcion:
    "API keys de la empresa (sin secretos): nombre, prefijo, scopes, responsable, último uso y validez. Paginada por cursor, de la más nueva a la más antigua.",
  permiso: PERMISOS_CORE.apikeysManage,
  // CAR-353: contrato único de listas (cursor + limite; items + siguiente).
  input: z.object({
    cursor: z.uuid().optional().describe("Id de la última key de la página anterior."),
    limite: z.number().int().min(1).max(100).default(100),
  }),
  output: z.object({ items: z.array(keySchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (ctx.alcance) throw prohibido("No tienes acceso a estas API keys.");
    const filas = await ctx.db.apiKey.findMany({
      include: { user: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const { items: keys, siguiente } = pagina(filas, input.limite, input.cursor);
    const activas = new Set(
      (await ctx.db.membership.findMany({ where: { estado: "activa" } })).map((m) => m.userId),
    );
    const ahora = Date.now();
    const items = keys.map((k) => ({
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
    return { items, siguiente };
  },
});
