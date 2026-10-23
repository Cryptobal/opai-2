import { autorizador } from "../contexto";
import type { Actor, Contexto, Correo, EventoAuditoria, EventoUso, UsuarioContexto } from "./tipos";
import type { Rol } from "@opai/domain";
import { dbEnMemoria } from "./db-memoria";

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
  semilla?: Parameters<typeof dbEnMemoria>[0];
};

/**
 * Contexto falso para tests de capacidades: base en memoria, auditoría, telemetría y correos
 * capturados. Con `plataforma` si el usuario tiene `platformRole` (usa la misma base).
 */
export function contextoDePrueba(o: OpcionesPrueba = {}) {
  const { db, globales, tabla } = dbEnMemoria(o.semilla);
  const eventos: EventoAuditoria[] = [];
  const usos: EventoUso[] = [];
  const correos: Correo[] = [];
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
    db,
    auditoria: { registrar: async (e) => void eventos.push(e) },
    telemetria: { registrar: async (e) => void usos.push(e) },
    servicios: {
      correo: { nombre: "memoria", enviar: async (c) => void correos.push(c) },
      urlBase: "https://test.opai.cl",
    },
    plataforma: usuario?.platformRole ? { globales, paraTenant: () => db } : null,
    autorizar: o.permisos ? (p) => (o.permisos ?? []).includes(p) : autorizador(rol, usuario),
  };
  return { ctx, eventos, usos, correos, tabla };
}
