import type { Rol } from "@opai/domain";

import { autorizador } from "../contexto";
import type { ConsumoNuevo, Principal } from "../types";
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
  usuario?: UsuarioContexto | null;
  actor?: Actor;
  conTenant?: boolean;
  modulosActivos?: readonly string[];
  scopes?: readonly string[] | null;
  principal?: Principal | null;
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
  let despachos = 0;
  const usuario = o.usuario === undefined ? USUARIO_DE_PRUEBA : o.usuario;
  const rol = o.rol === undefined ? "owner" : o.rol;
  const actor: Actor = o.actor ?? (usuario ? { tipo: "user", id: usuario.id } : { tipo: "system" });
  const ctx: Contexto = {
    tenantId: TENANT_DE_PRUEBA,
    conTenant: o.conTenant ?? true,
    actor,
    usuario,
    rol,
    portal: "erp",
    modulosActivos: o.modulosActivos ?? [],
    scopes: o.scopes ?? null,
    principal: o.principal ?? null,
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
    auditoria: { registrar: async (e) => void eventos.push(e) },
    medidor: { registrar: async (c) => void usos.push(c) },
    eventos: eventosEnMemoria(TENANT_DE_PRUEBA, actor),
    trabajos: trabajosEnMemoria(TENANT_DE_PRUEBA),
    bitacora: bitacoraEnMemoria(tabla, TENANT_DE_PRUEBA),
    diferir: (t) => void diferidos.push(t().catch(() => undefined)),
    despacharEventos: () => void (despachos += 1),
    servicios: {
      correo: { nombre: "memoria", enviar: async (c) => void correos.push(c) },
      urlBase: "https://test.opai.cl",
    },
    plataforma: usuario?.platformRole ? { globales, paraTenant: () => db } : null,
    autorizar: o.permisos ? (p) => (o.permisos ?? []).includes(p) : autorizador(rol, usuario),
  };
  const esperar = () => Promise.all(diferidos.splice(0));
  return { ctx, eventos, usos, correos, tabla, esperar, despachos: () => despachos };
}
