import {
  type Acceso,
  permisoDeKey,
  type Excepcion,
  moduloDe,
  type Rol,
  tienePermisoEfectivo,
  tienePermisoPlataforma,
} from "@opai/domain";
import { forTenant, globales, type Prisma } from "@opai/db";
import { almacenamientoDelEntorno, mailerDelEntorno } from "@opai/integrations";

import { idempotenciaSobre } from "./idempotencia";
import {
  bitacoraEnDb,
  eventosEnDb,
  medidorEnDb,
  trabajosEnDb,
  transaccionEnDb,
} from "./servicios-db";
import type {
  Actor,
  AgenteContexto,
  Alcance,
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
  /** Permisos del rol personalizado del tenant (null = el rol base de `rol`). ADR-022. */
  permisosRol?: readonly string[] | null;
  /** Excepciones de permiso por usuario sobre el rol. ADR-022. */
  excepciones?: readonly Excepcion[] | null;
  portal?: string | null;
  modulosActivos?: readonly string[];
  scopes?: readonly string[] | null;
  principal?: Principal | null;
  /**
   * Permisos finos de la API key (ids del catálogo), si ejecuta una (Identidad de servicio, t457u).
   * Presente (incluido `servicio`) ⇒ la autorización los cruza con los efectivos del responsable
   * (intersección); `permisos: null` ⇒ la key hereda los del responsable (compatibilidad). Un
   * principal `servicio` no hereda rol: sus permisos salen exclusivamente de esta lista.
   */
  claveApi?: { permisos: readonly string[] | null; servicio: boolean } | null;
  /** Alcance por filas del actor (null = ve todo). Lo resuelve el borde una vez (ADR-022, ADR-045). */
  alcance?: Alcance | null;
  agente?: AgenteContexto | null;
  medidor?: Medidor;
  /** Trabajo diferido (el borde usa `after()`). Por defecto, sin esperar y sin romper. */
  diferir?: (tarea: () => Promise<unknown>) => void;
  /** Despacho del outbox tras una escritura (lo implementa el borde). */
  despacharEventos?: () => void;
  servicios?: Partial<Servicios>;
};

/**
 * Autorización real (ADR-016, ADR-022, ADR-033 · Identidad de servicio t457u): `platform:*` solo
 * con `platformRole` y nunca para una API key; el resto, por el acceso efectivo en el tenant actual
 * (rol base o personalizado + excepciones, denegar-gana). Si ejecuta una API key con permisos finos,
 * el permiso además debe estar en los de la key (intersección: nadie supera a su responsable). Un
 * principal `servicio` no hereda rol: concede solo lo que la key lista. Módulo activo y scopes los
 * verifica `executeCapability`.
 */
export function autorizador(
  acceso: Acceso,
  usuario: UsuarioContexto | null,
  clave?: { permisos: readonly string[] | null; servicio: boolean } | null,
) {
  return (permiso: string): boolean => {
    if (moduloDe(permiso) === "platform") {
      // Una API key nunca obtiene permisos de plataforma, tenga o no responsable de plataforma.
      return !clave && tienePermisoPlataforma(usuario?.platformRole, permiso);
    }
    if (clave)
      return permisoDeKey(permiso, clave.permisos, clave.servicio, (p) =>
        tienePermisoEfectivo(acceso, p),
      );
    return tienePermisoEfectivo(acceso, permiso);
  };
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
    alcance: params.alcance ?? null,
    agente: params.agente ?? null,
    db: forTenant(tenantId),
    transaccion: transaccionEnDb(tenantId),
    // Lecturas de una capacidad en una sola transacción (ADR-045): fija `app.tenant_id` una vez en
    // vez de una transacción por consulta. Misma RLS (rol `opai_app`, `set_config` local a la tx).
    enLectura: transaccionEnDb(tenantId),
    auditoria: auditoriaEnDb,
    medidor: params.medidor ?? medidorEnDb,
    eventos: eventosEnDb(tenantId, params.actor),
    trabajos: trabajosEnDb(tenantId),
    bitacora: bitacoraEnDb(tenantId),
    idempotencia: idempotenciaSobre(forTenant(tenantId), tenantId, params.actor),
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
    // `ctx.rol` conserva el rol base (jerarquía y etiquetas). La autorización usa el rol
    // personalizado cuando existe: si hay `permisosRol`, el rol base cede a esa lista (ADR-022).
    // Si ejecuta una API key, además cruza con sus permisos finos (ADR-033, Identidad de servicio).
    autorizar: autorizador(
      {
        rol: params.permisosRol != null ? null : rol,
        permisosRol: params.permisosRol ?? null,
        excepciones: params.excepciones ?? null,
      },
      usuario,
      params.claveApi ?? null,
    ),
  };
}
