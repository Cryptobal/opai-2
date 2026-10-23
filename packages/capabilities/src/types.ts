import type { TenantDb } from "@opai/db";
import type { z } from "zod";

/** Efecto de una capacidad sobre los datos. Decide auditoría y confirmación (ADR-004). */
export type Efecto = "lectura" | "escritura" | "irreversible";

/** Quién ejecuta. Un agente actúa siempre "vía" un usuario responsable. */
export type Actor =
  | { tipo: "system"; id?: undefined; viaUserId?: undefined }
  | { tipo: "user"; id: string; viaUserId?: undefined }
  | { tipo: "agent"; id: string; viaUserId: string };

export type EventoAuditoria = {
  capability: string;
  actor: Actor;
  entityType?: string;
  entityId?: string;
  payload?: unknown;
};

export interface Auditoria {
  registrar(evento: EventoAuditoria): Promise<void>;
}

/** Contexto de ejecución. Lo construye el borde (ruta HTTP, acción de UI, MCP), nunca el módulo. */
export interface Contexto {
  tenantId: string;
  actor: Actor;
  /** Cliente acotado al tenant. Única vía de acceso a datos para los handlers. */
  db: TenantDb;
  auditoria: Auditoria;
  /** Decide si el actor tiene el permiso. En el Brief 00 solo las capacidades sin permiso pasan. */
  autorizar(permiso: string): boolean;
}

export type OpcionesEjecucion = {
  dryRun?: boolean;
  /** Clave de idempotencia aportada por el cliente (agentes). Se registra en auditoría. */
  idempotencyKey?: string;
};

/** Lo que recibe el handler además del input: si es vista previa y la clave de idempotencia. */
export type ModoEjecucion = { dryRun: boolean; idempotencyKey?: string };

export interface Capacidad<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> {
  /** `<modulo>.<entidad>.<verbo>` o `<modulo>.<verbo>`, en minúsculas. */
  id: string;
  /** Derivado del id: el primer segmento. */
  modulo: string;
  descripcion: string;
  /** `null` = sin permiso (solo capacidades públicas o del Brief 00). */
  permiso: string | null;
  input: I;
  output: O;
  efecto: Efecto;
  /** Si acepta `dryRun`: el handler calcula y describe sin persistir. Obligatorio si efecto ≠ lectura. */
  dryRun: boolean;
  handler: (ctx: Contexto, input: z.output<I>, modo: ModoEjecucion) => Promise<z.input<O>>;
}

export type CodigoError =
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "DRY_RUN_NOT_SUPPORTED"
  | "INVALID_OUTPUT"
  | "INTERNAL";

export type Resultado<T = unknown> =
  | { ok: true; data: T; dryRun: boolean }
  | { ok: false; error: { code: CodigoError; message: string; issues?: unknown } };
