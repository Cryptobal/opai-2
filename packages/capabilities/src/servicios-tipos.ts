// Tipos de los servicios del núcleo que reciben las capacidades por el Contexto (Brief 02). Los
// implementa el borde (base real) o `@opai/capabilities/testing` (memoria).
import type { HechoBitacora, TenantTx, VerificacionBitacora } from "@opai/db";

/** Una fila del medidor de consumos (ADR-031). `capacidad.ejecucion` la escribe executeCapability. */
export type ConsumoNuevo = {
  tenantId: string;
  recurso: string;
  unidad: string;
  cantidad: number;
  modulo: string;
  capability?: string | null;
  actorTipo: "user" | "agent" | "system";
  actorId?: string | null;
  viaUserId?: string | null;
  apiKeyId?: string | null;
  portal?: string | null;
  efecto?: string | null;
  dryRun?: boolean | null;
  ok?: boolean | null;
  duracionMs?: number | null;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  /** BYOK (credencial propia del tenant): se mide pero OPAI no lo cobra (ADR-031). */
  sinCosto?: boolean;
};

export interface Medidor {
  registrar(consumo: ConsumoNuevo): Promise<void>;
}

/** Evento de dominio a publicar por outbox en la misma transacción del cambio (ADR-029). */
export type EventoNuevo = {
  tipo: string;
  entidadTipo?: string;
  entidadId?: string;
  payload?: unknown;
};

export interface Eventos {
  /** Escribe el evento en el outbox dentro de `tx`. Devuelve su id. */
  emitir(tx: TenantTx, evento: EventoNuevo): Promise<string>;
}

export type TrabajoNuevo = {
  tipo: string;
  payload?: unknown;
  programadoPara?: Date;
  /** Evita duplicados: un segundo encolado con la misma clave no hace nada. */
  claveUnica?: string;
  maxIntentos?: number;
};

export interface Trabajos {
  /** Encola dentro de `tx`. Devuelve false si ya existía un trabajo con la misma clave. */
  encolar(tx: TenantTx, trabajo: TrabajoNuevo): Promise<boolean>;
}

export interface BitacoraServicio {
  registrar(tx: TenantTx, hecho: HechoBitacora): Promise<{ seq: number; hash: string }>;
  verificar(): Promise<VerificacionBitacora>;
}

/** Principal detrás de una API key (ADR-033). Sesiones humanas: "usuario". */
export type Principal = { tipo: "usuario" | "cuenta" | "persona"; id: string };
