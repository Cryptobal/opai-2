import { type Rol, tienePermiso, tienePermisoPlataforma, moduloDe } from "@opai/domain";
import { forTenant, globales, type Prisma } from "@opai/db";
import { almacenamientoDelEntorno, mailerDelEntorno } from "@opai/integrations";

import {
  bitacoraEnDb,
  eventosEnDb,
  medidorEnDb,
  trabajosEnDb,
  transaccionEnDb,
} from "./servicios-db";
import type {
  Actor,
  Auditoria,
  Contexto,
  EventoAuditoria,
  Medidor,
  Principal,
  Servicios,
  UsuarioContexto,
} from "./types";

export { medidorEnDb } from "./servicios-db";

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

export type ParametrosContexto = {
  /** null: sin tenant actual (plataforma sin empresa elegida, o usuario sin membresías). */
  tenantId: string | null;
  actor: Actor;
  usuario?: UsuarioContexto | null;
  rol?: Rol | null;
  portal?: string | null;
  modulosActivos?: readonly string[];
  scopes?: readonly string[] | null;
  principal?: Principal | null;
  medidor?: Medidor;
  /** Trabajo diferido (el borde usa `after()`). Por defecto, sin esperar y sin romper. */
  diferir?: (tarea: () => Promise<unknown>) => void;
  /** Despacho del outbox tras una escritura (lo implementa el borde). */
  despacharEventos?: () => void;
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

const diferirPorDefecto = (tarea: () => Promise<unknown>) => void tarea().catch(() => undefined);

/** Construye el contexto de ejecución desde el borde (ruta HTTP, acción de UI, MCP, cron). */
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
    principal: params.principal ?? null,
    db: forTenant(tenantId),
    transaccion: transaccionEnDb(tenantId),
    auditoria: auditoriaEnDb,
    medidor: params.medidor ?? medidorEnDb,
    eventos: eventosEnDb(tenantId, params.actor),
    trabajos: trabajosEnDb(tenantId),
    bitacora: bitacoraEnDb(tenantId),
    diferir: params.diferir ?? diferirPorDefecto,
    despacharEventos: params.despacharEventos ?? (() => undefined),
    servicios: {
      correo: params.servicios?.correo ?? mailerDelEntorno(),
      almacenamiento: params.servicios?.almacenamiento ?? almacenamientoDelEntorno(),
      urlBase:
        params.servicios?.urlBase ?? process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
    },
    plataforma: usuario?.platformRole
      ? { globales: globales(), paraTenant: (id: string) => forTenant(id) }
      : null,
    autorizar: autorizador(rol, usuario),
  };
}
