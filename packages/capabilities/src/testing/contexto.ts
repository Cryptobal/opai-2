import type { Excepcion, Rol } from "@opai/domain";

import { autorizador } from "../contexto";
import { idempotenciaSobre } from "../idempotencia";
import type { AgenteContexto, Alcance, ConsumoNuevo, Principal } from "../types";
import { almacenamientoEnMemoria } from "./almacenamiento-memoria";
import { dbEnMemoria } from "./db-memoria";
import { bitacoraEnMemoria, eventosEnMemoria, trabajosEnMemoria } from "./servicios-memoria";
import type { Actor, Contexto, Correo, EventoAuditoria, UsuarioContexto } from "./tipos";

export const TENANT_DE_PRUEBA = "0192f3a0-0000-7000-8000-000000000001";
export const USUARIO_DE_PRUEBA: UsuarioContexto = {
  id: "0192f3a0-0000-7000-8000-0000000000a1",
  nombre: "Ana Prueba",
  email: "ana@prueba.cl",
  platformRole: null,
};

export type OpcionesPrueba = {
  /** Permisos explícitos (ignora rol). Si se omite, se usa la autorización real por `rol`. */
  permisos?: readonly string[];
  rol?: Rol | null;
  /** Rol personalizado del tenant (null = rol base). ADR-022. */
  permisosRol?: readonly string[] | null;
  /** Excepciones de permiso por usuario. ADR-022. */
  excepciones?: readonly Excepcion[] | null;
  usuario?: UsuarioContexto | null;
  actor?: Actor;
  conTenant?: boolean;
  portal?: string | null;
  portalesMembresia?: readonly string[];
  modulosActivos?: readonly string[];
  scopes?: readonly string[] | null;
  principal?: Principal | null;
  /** Alcance por filas del actor (null = ve todo). ADR-022 · Brief 07c B3. */
  alcance?: Alcance | null;
  agente?: AgenteContexto | null;
  semilla?: Parameters<typeof dbEnMemoria>[0];
};

/**
 * Contexto falso para tests de capacidades: base en memoria, auditoría, consumos, correos, eventos,
 * trabajos y bitácora capturados. Con `plataforma` si el usuario tiene `platformRole`.
 * `esperar()` resuelve el trabajo diferido (como `after()` del borde).
 */
export function contextoDePrueba(o: OpcionesPrueba = {}) {
  const { db, tx, globales, tabla, instantanea } = dbEnMemoria(o.semilla);
  const eventos: EventoAuditoria[] = [];
  const usos: ConsumoNuevo[] = [];
  const correos: Correo[] = [];
  const diferidos: Promise<unknown>[] = [];
  const almacen = almacenamientoEnMemoria();
  let despachos = 0;
  const usuario = o.usuario === undefined ? USUARIO_DE_PRUEBA : o.usuario;
  const rol = o.rol === undefined ? "owner" : o.rol;
  const actor: Actor = o.actor ?? (usuario ? { tipo: "user", id: usuario.id } : { tipo: "system" });
  const ctx: Contexto = {
    mfa: { activa: true, verificada: true, obligatoria: true },
    tenantId: TENANT_DE_PRUEBA,
    conTenant: o.conTenant ?? true,
    actor,
    usuario,
    rol,
    portal: o.portal === undefined ? "erp" : o.portal,
    portalesMembresia: o.portalesMembresia ?? ["erp"],
    modulosActivos: o.modulosActivos ?? [],
    scopes: o.scopes ?? null,
    principal: o.principal ?? null,
    alcance: o.alcance ?? null,
    agente: o.agente ?? null,
    db,
    // Atómica como la real: si `fn` falla, las tablas vuelven al estado previo.
    transaccion: async (fn) => {
      const restaurar = instantanea();
      try {
        return await fn(tx);
      } catch (e) {
        restaurar();
        throw e;
      }
    },
    // También en la tabla, para las capacidades que leen la auditoría (actividad de las fichas).
    auditoria: {
      registrar: async (e) => {
        eventos.push(e);
        await db.auditEvent.create({
          data: {
            tenantId: e.tenantId,
            actorType: e.actor.tipo,
            actorId: e.actor.id ?? null,
            viaUserId: e.actor.viaUserId ?? null,
            capability: e.capability,
            entityType: e.entityType ?? null,
            entityId: e.entityId ?? null,
            payload: JSON.parse(JSON.stringify(e.payload ?? null)),
          },
        });
      },
    },
    medidor: { registrar: async (c) => void usos.push(c) },
    eventos: eventosEnMemoria(TENANT_DE_PRUEBA, actor),
    trabajos: trabajosEnMemoria(TENANT_DE_PRUEBA),
    bitacora: bitacoraEnMemoria(tabla, TENANT_DE_PRUEBA),
    idempotencia: idempotenciaSobre(db, TENANT_DE_PRUEBA, actor),
    diferir: (t) => void diferidos.push(t().catch(() => undefined)),
    despacharEventos: () => void (despachos += 1),
    servicios: {
      correo: { nombre: "memoria", enviar: async (c) => void correos.push(c) },
      almacenamiento: almacen.almacenamiento,
      urlBase: "https://test.opai.cl",
    },
    plataforma: usuario?.platformRole ? { globales, paraTenant: () => db } : null,
    autorizar: o.permisos
      ? (p) => (o.permisos ?? []).includes(p)
      : autorizador(
          {
            rol: o.permisosRol != null ? null : rol,
            permisosRol: o.permisosRol ?? null,
            excepciones: o.excepciones ?? null,
          },
          usuario,
        ),
  };
  const esperar = () => Promise.all(diferidos.splice(0));
  return { ctx, eventos, usos, correos, tabla, esperar, almacen, despachos: () => despachos };
}
