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
  /**
   * El gasto ya ocurrió con el proveedor (IA, mapas, correo, almacenamiento) antes de medirlo: se
   * registra siempre, aunque supere el tope, para no perder trazabilidad (BRIEF-02 §4.9). Solo
   * `capacidad.ejecucion` (prepago, antes del handler) puede rechazarse sin incurrir en el gasto.
   */
  yaIncurrido?: boolean;
};

export interface Medidor {
  registrar(consumo: ConsumoNuevo): Promise<void>;
  /** Reserva y cobra antes del efecto; al terminar completa la misma fila, sin duplicar el cargo. */
  preparar?(consumo: ConsumoNuevo): Promise<FinalizarConsumo>;
}

export type FinalizarConsumo = (estado: { ok: boolean; duracionMs: number }) => Promise<void>;

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

/** Datos de la API key que ejecuta (ADR-032): presupuesto mensual y autonomía por capacidad. */
export type AgenteContexto = {
  apiKeyId: string;
  nombre: string;
  /** Micro-USD; null = sin presupuesto. */
  presupuestoMensualMicro: bigint | null;
  /** capability → "directo" | "aprobacion". Sin entrada, lo irreversible pide aprobación. */
  autonomia: Record<string, string>;
};

/**
 * Principal detrás de una API key (ADR-033, Identidad de servicio t457u). Sesiones humanas:
 * "usuario". "servicio": agente del tenant sin dueño humano (integraciones, agentes alojados, bots
 * de desarrollo); su responsable es una persona solo para gobierno y sus permisos salen solo de la
 * key (no hereda rol).
 */
export type Principal = { tipo: "usuario" | "cuenta" | "persona" | "servicio"; id: string };
