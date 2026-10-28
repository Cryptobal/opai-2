import { z } from "zod";

import {
  moduloDe,
  PERMISOS_CORE,
  PERMISOS_PLATAFORMA,
  tienePermisoPlataforma,
  vocabulario,
} from "@opai/domain";

import { enScope } from "../autorizacion";
import { defineCapability } from "../define";
import { listarModulos } from "../module";
import { tenantSchema } from "./esquemas";

/** Catálogo de permisos conocidos: núcleo + módulos registrados. */
export function catalogoPermisos(): string[] {
  return [
    ...Object.values(PERMISOS_CORE),
    ...listarModulos().flatMap((m) => m.permisos.map((p) => p.id)),
  ];
}

export const me = defineCapability({
  id: "core.me",
  descripcion:
    "Quién soy: usuario, actor (usuario o agente vía usuario), empresa actual, rol, portales, permisos efectivos y módulos activos.",
  permiso: null,
  sinTenant: true,
  portales: ["erp", "supervisor", "trabajador", "terreno"],
  input: z.object({}),
  output: z.object({
    usuario: z
      .object({
        id: z.string(),
        nombre: z.string(),
        email: z.string(),
        platformRole: z.string().nullable(),
      })
      .nullable(),
    actor: z.object({
      tipo: z.string(),
      id: z.string().nullable(),
      viaUserId: z.string().nullable(),
    }),
    tenant: tenantSchema.nullable(),
    rol: z.string().nullable(),
    portales: z.array(z.string()),
    portalInicio: z
      .string()
      .nullable()
      .describe("Portal donde entrar; null = el primero permitido."),
    permisos: z.array(z.string()),
    modulosActivos: z.array(z.string()),
    scopes: z
      .array(z.string())
      .nullable()
      .describe(
        'Scopes de la API key que ejecuta (null en una sesión). Las herramientas de un módulo fuera de los scopes no aparecen en tools/list; "*" cubre todo salvo "platform".',
      ),
    principal: z.object({ tipo: z.string(), id: z.string() }).nullable(),
    agente: z
      .object({ nombre: z.string(), presupuestoMensualUsd: z.number().nullable() })
      .nullable()
      .describe("Si ejecuta una API key: su nombre y presupuesto mensual."),
    notificacionesNoLeidas: z.number(),
    vocabulario: z
      .record(z.string(), z.unknown())
      .nullable()
      .describe("Términos de la vertical (p. ej. persona → guardia) para los textos visibles."),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const tenant = ctx.conTenant
      ? await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId } })
      : null;
    const membresia =
      tenant && ctx.usuario
        ? await ctx.db.membership.findUnique({
            where: { tenantId_userId: { tenantId: tenant.id, userId: ctx.usuario.id } },
          })
        : null;
    // Permisos efectivos (ADR-022): rol base o personalizado + excepciones, por `ctx.autorizar`.
    const activos = new Set(["core", ...ctx.modulosActivos]);
    // Con una API key, solo los módulos de sus scopes: lo mismo que `tools/list` (antes listaba,
    // p. ej., `comercial:*` aunque la key no tuviera el scope y el MCP no mostrara `comercial_*`).
    const deTenant = catalogoPermisos().filter(
      (p) => activos.has(moduloDe(p)) && enScope(ctx, moduloDe(p)) && ctx.autorizar(p),
    );
    // Plataforma: la sesión de un usuario de plataforma o una key de plataforma (ADR-055).
    const dePlataforma = Object.values(PERMISOS_PLATAFORMA).filter(
      (p) =>
        (ctx.actor.tipo === "user" || ctx.plataforma !== null) &&
        enScope(ctx, "platform") &&
        tienePermisoPlataforma(ctx.usuario?.platformRole, p) &&
        ctx.autorizar(p),
    );
    return {
      usuario: ctx.usuario,
      actor: {
        tipo: ctx.actor.tipo,
        id: ctx.actor.id ?? null,
        viaUserId: ctx.actor.viaUserId ?? null,
      },
      tenant,
      rol: ctx.rol,
      portales: membresia?.portales ?? [],
      portalInicio: membresia?.portalInicio ?? null,
      permisos: [...deTenant, ...dePlataforma],
      modulosActivos: [...ctx.modulosActivos],
      scopes: ctx.scopes ? [...ctx.scopes] : null,
      principal: ctx.principal,
      agente: ctx.agente
        ? {
            nombre: ctx.agente.nombre,
            presupuestoMensualUsd:
              ctx.agente.presupuestoMensualMicro === null
                ? null
                : Number(ctx.agente.presupuestoMensualMicro) / 1_000_000,
          }
        : null,
      notificacionesNoLeidas:
        tenant && ctx.actor.tipo === "user"
          ? await ctx.db.notificacion.count({ where: { usuarioId: ctx.actor.id, leidaEn: null } })
          : 0,
      vocabulario: tenant ? { ...vocabulario(tenant.vertical) } : null,
    };
  },
});
