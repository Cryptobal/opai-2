import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido, reglaDeNegocio } from "../errores";
import { listarModulos } from "../module";
import { normalizarPermisosRol } from "./permisos/comun";
import { iso, tenantActual, usuarioResponsable } from "./comun";
import { generarApiKey } from "./apikey-formato";
export { apikeysRevoke } from "./apikey-revoke";

import { keySchema } from "./apikey-schema";
export { keySchema } from "./apikey-schema";

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

export const apikeysCreate = defineCapability({
  id: "core.apikeys.create",
  // Credenciales y keys las gestionan personas: un agente no se crea keys ni cambia secretos.
  soloPersonas: true,
  descripcion:
    "Crea una API key para un agente (tipo 'usuario' u 'servicio'), vinculada al usuario que la crea (responsable). Los permisos finos deben ser un subconjunto de los tuyos; un 'servicio' no hereda rol y exige presupuesto. Devuelve el secreto UNA sola vez.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({
    nombre: z.string().trim().min(2).max(60),
    /** "usuario": opera con los permisos del responsable. "servicio": sin dueño humano (t457u). */
    tipo: z.enum(["usuario", "servicio"]).default("usuario"),
    scopes: z.array(z.string().min(1)).min(1),
    /**
     * Permisos finos (ids del catálogo, admite comodines que se expanden). Deben ser un subconjunto
     * de los tuyos. Omitir = hereda los del responsable (solo tipo "usuario"). Obligatorio en "servicio".
     */
    permisos: z.array(z.string().min(1)).optional(),
    /** Fecha ISO 8601 (las herramientas MCP necesitan un input expresable en JSON Schema). */
    expiraEn: z.iso.datetime({ offset: true }).optional(),
    presupuestoMensualUsd: z
      .number()
      .min(0)
      .max(100_000)
      .optional()
      .describe(
        "Tope de gasto mensual en USD (IA, mapas, correo…). Requiere permiso de agentes. Obligatorio para 'servicio'.",
      ),
  }),
  output: z.object({
    id: z.string().nullable(),
    nombre: z.string(),
    prefijo: z.string(),
    scopes: z.array(z.string()),
    tipo: z.string(),
    permisos: z.array(z.string()).nullable(),
    /** Aviso cuando el scope es "*": amplio y transitorio (ADR-034). */
    advertencia: z.string().nullable(),
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
    const servicio = input.tipo === "servicio";
    if (input.presupuestoMensualUsd !== undefined && !ctx.autorizar(PERMISOS_CORE.agentesManage)) {
      throw prohibido("Fijar el presupuesto de un agente requiere el permiso de agentes.");
    }
    // Un servicio es un agente sin dueño humano: sus permisos salen solo de la key, así que exige
    // presupuesto (no nulo) y una lista de permisos explícita (t457u).
    if (servicio) {
      if (ctx.alcance !== null) {
        throw prohibido(
          "Un usuario con alcance restringido no puede crear servicios de alcance completo.",
        );
      }
      if (!(input.presupuestoMensualUsd && input.presupuestoMensualUsd > 0)) {
        throw reglaDeNegocio("Un agente de servicio exige un presupuesto mensual mayor que cero.");
      }
      if (input.permisos === undefined) {
        throw reglaDeNegocio(
          "Un agente de servicio exige una lista de permisos (sus propios permisos).",
        );
      }
    }
    // Permisos finos: nadie crea una key con permisos que no tiene. `normalizarPermisosRol` expande
    // comodines, valida el catálogo y rechaza lo que el creador no pueda conceder (acceso efectivo).
    const permisos =
      input.permisos !== undefined ? normalizarPermisosRol(ctx, input.permisos) : null;
    const hereda = permisos === null;
    const scopeAmplio = input.scopes.includes("*");
    const advertencia = scopeAmplio
      ? 'El scope "*" es amplio y transitorio (ADR-034): la key verá todos los módulos que se activen. Prefiere scopes mínimos por módulo.'
      : null;
    const tenant = await tenantActual(ctx);
    const { secreto, prefijo, hash } = generarApiKey(tenant.slug);
    const base = { nombre: input.nombre, scopes: input.scopes, tipo: input.tipo, permisos };
    if (dryRun)
      return { id: null, ...base, prefijo: `opai_${tenant.slug}_…`, advertencia, secreto: null };
    const key = await ctx.db.apiKey.create({
      data: {
        nombre: input.nombre,
        scopes: input.scopes,
        tenantId: tenant.id,
        userId: usuarioResponsable(ctx),
        principalTipo: input.tipo,
        permisos: permisos ?? [],
        heredaPermisos: hereda,
        prefijo,
        hash,
        expiraEn,
        presupuestoMensualMicro:
          input.presupuestoMensualUsd === undefined
            ? null
            : BigInt(Math.round(input.presupuestoMensualUsd * 1_000_000)),
      },
    });
    return { id: key.id, ...base, prefijo, advertencia, secreto };
  },
});
