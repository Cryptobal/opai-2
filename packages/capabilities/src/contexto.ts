import {
  type Acceso,
  permisoDeKey,
  moduloDe,
  tienePermisoEfectivo,
  tienePermisoPlataforma,
} from "@opai/domain";
import { accesoPlataforma, enTransaccion, forTenant } from "@opai/db";
import { almacenamientoDelEntorno, mailerDelEntorno } from "@opai/integrations";

import { idempotenciaSobre } from "./idempotencia";
import { empresaDePlataforma } from "./plataforma-empresa";
import {
  auditoriaEnDb,
  bitacoraEnDb,
  eventosEnDb,
  identidadEnDb,
  medidorEnDb,
  trabajosEnDb,
  transaccionEnDb,
} from "./servicios-db";
import type { Actor, Contexto, UsuarioContexto } from "./types";
import { type ClaveApi, type ParametrosContexto } from "./contexto-tipos";

export { auditoriaEnDb, medidorEnDb } from "./servicios-db";
export { type ClaveApi, type ParametrosContexto } from "./contexto-tipos";

/** Id nulo para contextos sin tenant (plataforma sin empresa elegida). RLS no devuelve filas. */
export const SIN_TENANT = "00000000-0000-0000-0000-000000000000";

/**
 * Autorización real (ADR-016, ADR-022, ADR-033 · Identidad de servicio t457u): `platform:*` solo
 * con `platformRole` y nunca para una API key; el resto, por el acceso efectivo en el tenant actual
 * (rol base o personalizado + excepciones, denegar-gana). Si ejecuta una API key con permisos finos,
 * el permiso además debe estar entre los efectivos ACTUALES del responsable (`accesoResponsable`,
 * H15): nadie supera a su responsable, y si este baja de rol, personaliza su rol o recibe una
 * excepción que deniega, la key lo pierde de inmediato, sea de servicio o delegada. Un principal
 * `servicio` no hereda rol ni alcance (su `acceso` propio queda vacío): concede solo lo que la key
 * lista, acotado igual por `accesoResponsable`. Módulo activo y scopes los verifica
 * `executeCapability`.
 */
export function autorizador(
  acceso: Acceso,
  usuario: UsuarioContexto | null,
  clave?: ClaveApi | null,
  accesoResponsable: Acceso = acceso,
) {
  return (permiso: string): boolean => {
    if (moduloDe(permiso) === "platform") {
      // Una API key solo obtiene permisos de plataforma si es de plataforma (`claveDePlataforma`):
      // y aun así, nunca más que el `platformRole` VIGENTE de su responsable (ADR-055).
      if (clave && !claveDePlataforma(clave)) return false;
      return tienePermisoPlataforma(usuario?.platformRole, permiso);
    }
    if (clave)
      return permisoDeKey(permiso, clave.permisos, clave.servicio, (p) =>
        tienePermisoEfectivo(accesoResponsable, p),
      );
    return tienePermisoEfectivo(acceso, permiso);
  };
}

/**
 * Key de plataforma (ADR-055): scope explícito "platform" (el "*" nunca lo cubre), tipo "usuario" y
 * hereda los permisos del responsable. El `platformRole` del responsable se cruza aparte, en vivo.
 */
export function claveDePlataforma(clave: ClaveApi | null | undefined): boolean {
  return Boolean(clave?.plataforma) && !clave?.servicio && clave?.permisos === null;
}

/**
 * Si el contexto obtiene `ctx.plataforma`: usuario con `platformRole` y, si es un agente, solo una
 * key de plataforma (nunca el agente interno de ADR-049).
 */
export function conAccesoPlataforma(
  usuario: UsuarioContexto | null,
  actor: Actor,
  clave: ClaveApi | null | undefined,
): boolean {
  if (!usuario?.platformRole) return false;
  return actor.tipo !== "agent" || (!actor.interno && claveDePlataforma(clave));
}

const diferirPorDefecto = (tarea: () => Promise<unknown>) => void tarea().catch(() => undefined);

/** Construye el contexto de ejecución desde el borde (ruta HTTP, acción de UI, MCP, cron). */
export function crearContexto(params: ParametrosContexto): Contexto {
  const tenantId = params.tenantId ?? SIN_TENANT;
  const usuario = params.usuario ?? null;
  const rol = params.rol ?? null;
  return {
    ...(params.mfa ? { mfa: params.mfa } : {}),
    tenantId,
    conTenant: params.tenantId !== null,
    actor: params.actor,
    usuario,
    rol,
    portal: params.portal ?? null,
    portalesMembresia: params.portalesMembresia ?? [],
    modulosActivos: params.modulosActivos ?? [],
    scopes: params.scopes ?? null,
    principal: params.principal ?? null,
    alcance: params.alcance ?? null,
    agente: params.agente ?? null,
    db: forTenant(tenantId),
    transaccion: transaccionEnDb(tenantId),
    transaccionIndependiente: transaccionEnDb(tenantId),
    // Lecturas de una capacidad en una sola transacción (ADR-045): fija `app.tenant_id` una vez en
    // vez de una transacción por consulta. Misma RLS (rol `opai_app`, `set_config` local a la tx).
    enLectura: transaccionEnDb(tenantId),
    auditoria: auditoriaEnDb(tenantId),
    medidor: params.medidor ?? medidorEnDb,
    eventos: eventosEnDb(tenantId, params.actor),
    trabajos: trabajosEnDb(tenantId),
    bitacora: bitacoraEnDb(tenantId),
    identidad: identidadEnDb(),
    idempotencia: idempotenciaSobre(forTenant(tenantId), tenantId, params.actor),
    diferir: params.diferir ?? diferirPorDefecto,
    despacharEventos: params.despacharEventos ?? (() => undefined),
    servicios: {
      correo: params.servicios?.correo ?? mailerDelEntorno(),
      almacenamiento: params.servicios?.almacenamiento ?? almacenamientoDelEntorno(),
      urlBase:
        params.servicios?.urlBase ?? process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
    },
    // Para un agente, solo con una key de plataforma (ADR-055; antes nunca, H15/H del Revisor): una
    // key común no obtiene el acceso de plataforma del responsable aunque este tenga `platformRole`
    // (el permiso ya lo bloquea `autorizador`, y `requierePlataforma` depende de este objeto, no
    // del permiso, como defensa en profundidad). El agente interno (ADR-049) nunca lo obtiene.
    plataforma: conAccesoPlataforma(usuario, params.actor, params.claveApi)
      ? {
          globales: accesoPlataforma(),
          empresa: (id: string) => empresaDePlataforma(forTenant(id), id),
          auditarEnObjetivo: (id, hecho, evento) =>
            enTransaccion(id, async (tx) => {
              await accesoPlataforma().auditarPlataforma(hecho, tx);
              await auditoriaEnDb(id).registrar(tx, evento);
            }),
        }
      : null,
    // `ctx.rol` conserva el rol base (jerarquía y etiquetas). La autorización usa el rol
    // personalizado cuando existe: si hay `permisosRol`, el rol base cede a esa lista (ADR-022).
    // Si ejecuta una API key, además cruza con los efectivos actuales del responsable (H15).
    autorizar: autorizador(
      {
        rol: params.permisosRol != null ? null : rol,
        permisosRol: params.permisosRol ?? null,
        excepciones: params.excepciones ?? null,
      },
      usuario,
      params.claveApi ?? null,
      params.accesoResponsable ?? undefined,
    ),
  };
}
