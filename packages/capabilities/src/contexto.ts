import { type Rol, tienePermiso, tienePermisoPlataforma, moduloDe } from "@opai/domain";
import { forTenant, globales, type Prisma } from "@opai/db";
import { mailerDelEntorno } from "@opai/integrations/email";

import type {
  Actor,
  Auditoria,
  Contexto,
  EventoAuditoria,
  EventoUso,
  Servicios,
  Telemetria,
  UsuarioContexto,
} from "./types";

/** Id nulo para contextos sin tenant (plataforma sin empresa elegida). RLS no devuelve filas. */
export const SIN_TENANT = "00000000-0000-0000-0000-000000000000";

/** Auditoría persistida en `core.audit_events` del tenant del evento. */
export const auditoriaEnDb: Auditoria = {
  async registrar(evento: EventoAuditoria): Promise<void> {
    // JSON plano: elimina undefined, funciones y referencias circulares antes de persistir.
    const payload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(evento.payload ?? null));
    await forTenant(evento.tenantId).auditEvent.create({
      data: {
        tenantId: evento.tenantId,
        actorType: evento.actor.tipo,
        actorId: evento.actor.id ?? null,
        viaUserId: evento.actor.viaUserId ?? null,
        capability: evento.capability,
        entityType: evento.entityType ?? null,
        entityId: evento.entityId ?? null,
        payload,
      },
    });
  },
};

/** Telemetría persistida en `core.usage_events`. El borde la envuelve en `after()`. */
export const telemetriaEnDb: Telemetria = {
  async registrar(evento: EventoUso): Promise<void> {
    await forTenant(evento.tenantId).usageEvent.create({ data: evento });
  },
};

export type ParametrosContexto = {
  /** null: sin tenant actual (plataforma sin empresa elegida, o usuario sin membresías). */
  tenantId: string | null;
  actor: Actor;
  usuario?: UsuarioContexto | null;
  rol?: Rol | null;
  portal?: string | null;
  modulosActivos?: readonly string[];
  scopes?: readonly string[] | null;
  telemetria?: Telemetria;
  servicios?: Partial<Servicios>;
};

/**
 * Autorización real (ADR-016): `platform:*` solo con `platformRole`; el resto, por el rol de la
 * membresía en el tenant actual. Módulo activo y scopes los verifica `executeCapability`.
 */
export function autorizador(rol: Rol | null, usuario: UsuarioContexto | null) {
  return (permiso: string): boolean =>
    moduloDe(permiso) === "platform"
      ? tienePermisoPlataforma(usuario?.platformRole, permiso)
      : rol !== null && tienePermiso(rol, permiso);
}

/** Construye el contexto de ejecución desde el borde (ruta HTTP, acción de UI, MCP). */
export function crearContexto(params: ParametrosContexto): Contexto {
  const tenantId = params.tenantId ?? SIN_TENANT;
  const usuario = params.usuario ?? null;
  const rol = params.rol ?? null;
  return {
    tenantId,
    conTenant: params.tenantId !== null,
    actor: params.actor,
    usuario,
    rol,
    portal: params.portal ?? null,
    modulosActivos: params.modulosActivos ?? [],
    scopes: params.scopes ?? null,
    db: forTenant(tenantId),
    auditoria: auditoriaEnDb,
    telemetria: params.telemetria ?? telemetriaEnDb,
    servicios: {
      correo: params.servicios?.correo ?? mailerDelEntorno(),
      urlBase:
        params.servicios?.urlBase ?? process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
    },
    plataforma: usuario?.platformRole
      ? { globales: globales(), paraTenant: (id: string) => forTenant(id) }
      : null,
    autorizar: autorizador(rol, usuario),
  };
}
