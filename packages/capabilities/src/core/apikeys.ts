import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { listarModulos } from "../module";
import { iso, tenantActual, usuarioResponsable } from "./comun";
import { generarApiKey } from "./apikey-formato";
import { uuidSchema } from "./esquemas";

const keySchema = z.object({
  id: z.string(),
  nombre: z.string(),
  prefijo: z.string(),
  scopes: z.array(z.string()),
  responsable: z.object({ nombre: z.string(), email: z.string() }),
  ultimoUsoEn: z.string().nullable(),
  expiraEn: z.string().nullable(),
  revocadaEn: z.string().nullable(),
  /** false si está revocada, vencida o el responsable ya no tiene membresía activa. */
  valida: z.boolean(),
});

export const apikeysList = defineCapability({
  id: "core.apikeys.list",
  descripcion:
    "API keys de la empresa (sin secretos): nombre, prefijo, scopes, responsable, último uso y validez.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({}),
  output: z.array(keySchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
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
      responsable: { nombre: k.user.name, email: k.user.email },
      ultimoUsoEn: iso(k.ultimoUsoEn),
      expiraEn: iso(k.expiraEn),
      revocadaEn: iso(k.revocadaEn),
      valida:
        !k.revocadaEn && (!k.expiraEn || k.expiraEn.getTime() > ahora) && activas.has(k.userId),
    }));
  },
});

export const apikeysCreate = defineCapability({
  id: "core.apikeys.create",
  // Credenciales y keys las gestionan personas: un agente no se crea keys ni cambia secretos.
  soloPersonas: true,
  descripcion:
    "Crea una API key para un agente, vinculada al usuario que la crea (responsable). Devuelve el secreto UNA sola vez.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({
    nombre: z.string().trim().min(2).max(60),
    scopes: z.array(z.string().min(1)).min(1),
    /** Fecha ISO 8601 (las herramientas MCP necesitan un input expresable en JSON Schema). */
    expiraEn: z.iso.datetime({ offset: true }).optional(),
    presupuestoMensualUsd: z
      .number()
      .min(0)
      .max(100_000)
      .optional()
      .describe("Tope de gasto mensual en USD (IA, mapas, correo…). Requiere permiso de agentes."),
  }),
  output: z.object({
    id: z.string().nullable(),
    nombre: z.string(),
    prefijo: z.string(),
    scopes: z.array(z.string()),
    /** Solo en la creación real. No se puede recuperar después. */
    secreto: z.string().nullable(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const validos = new Set(["*", "core", ...listarModulos().map((m) => m.id)]);
    const invalidos = input.scopes.filter((s) => !validos.has(s));
    if (invalidos.length) throw reglaDeNegocio(`Scopes desconocidos: ${invalidos.join(", ")}.`);
    const expiraEn = input.expiraEn ? new Date(input.expiraEn) : null;
    if (expiraEn && expiraEn.getTime() <= Date.now()) {
      throw reglaDeNegocio("La fecha de expiración debe ser futura.");
    }
    if (input.presupuestoMensualUsd !== undefined && !ctx.autorizar(PERMISOS_CORE.agentesManage)) {
      throw prohibido("Fijar el presupuesto de un agente requiere el permiso de agentes.");
    }
    const tenant = await tenantActual(ctx);
    const { secreto, prefijo, hash } = generarApiKey(tenant.slug);
    const base = { nombre: input.nombre, scopes: input.scopes };
    if (dryRun) return { id: null, ...base, prefijo: `opai_${tenant.slug}_…`, secreto: null };
    const key = await ctx.db.apiKey.create({
      data: {
        ...base,
        tenantId: tenant.id,
        userId: usuarioResponsable(ctx),
        prefijo,
        hash,
        expiraEn,
        presupuestoMensualMicro:
          input.presupuestoMensualUsd === undefined
            ? null
            : BigInt(Math.round(input.presupuestoMensualUsd * 1_000_000)),
      },
    });
    return { id: key.id, ...base, prefijo, secreto };
  },
});

export const apikeysRevoke = defineCapability({
  id: "core.apikeys.revoke",
  // Credenciales y keys las gestionan personas: un agente no se crea keys ni cambia secretos.
  soloPersonas: true,
  descripcion: "Revoca una API key. Deja de funcionar de inmediato; no se puede deshacer.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ apiKeyId: uuidSchema }),
  output: z.object({ id: z.string(), nombre: z.string(), revocadaEn: z.string() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const key = await ctx.db.apiKey.findUnique({ where: { id: input.apiKeyId } });
    if (!key) throw noEncontrado("La API key");
    if (key.revocadaEn || dryRun) {
      return {
        id: key.id,
        nombre: key.nombre,
        revocadaEn: (key.revocadaEn ?? new Date()).toISOString(),
      };
    }
    const r = await ctx.db.apiKey.update({
      where: { id: key.id },
      data: { revocadaEn: new Date() },
    });
    return { id: r.id, nombre: r.nombre, revocadaEn: (r.revocadaEn ?? new Date()).toISOString() };
  },
});
