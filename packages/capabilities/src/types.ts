import type { Rol, RolPlataforma } from "@opai/domain";
import type { Globales, TenantDb, TenantTx } from "@opai/db";
import type { Mailer } from "@opai/integrations/email";
import type { z } from "zod";

import type { BitacoraServicio, Eventos, Medidor, Principal, Trabajos } from "./servicios-tipos";

export type * from "./servicios-tipos";

/** Efecto de una capacidad sobre los datos. Decide auditoría y confirmación (ADR-004). */
export type Efecto = "lectura" | "escritura" | "irreversible";

/** Quién ejecuta. Un agente actúa siempre "vía" un usuario responsable. */
export type Actor =
  | { tipo: "system"; id?: undefined; viaUserId?: undefined }
  | { tipo: "user"; id: string; viaUserId?: undefined }
  | { tipo: "agent"; id: string; viaUserId: string };

export type EventoAuditoria = {
  /** Tenant donde queda el evento (el actual o, en plataforma, el tenant objetivo). */
  tenantId: string;
  capability: string;
  actor: Actor;
  entityType?: string;
  entityId?: string;
  payload?: unknown;
};

export interface Auditoria {
  registrar(evento: EventoAuditoria): Promise<void>;
}

/** Usuario humano detrás del actor (el propio usuario o el responsable de la API key). */
export type UsuarioContexto = {
  id: string;
  nombre: string;
  email: string;
  platformRole: RolPlataforma | null;
};

/** Servicios del núcleo disponibles para las capacidades. Los implementa el borde. */
export type Servicios = {
  correo: Mailer;
  /** URL pública de la app, para enlaces en correos ("https://test.opai.cl"). */
  urlBase: string;
};

/** Acceso de plataforma: solo existe si el usuario tiene `platformRole` (ADR-016). */
export type Plataforma = {
  globales: Globales;
  /** Cliente acotado al tenant objetivo. Nunca consultas cross-tenant en una sola query. */
  paraTenant(tenantId: string): TenantDb;
};

/** Contexto de ejecución. Lo construye el borde (ruta HTTP, acción de UI, MCP), nunca el módulo. */
export interface Contexto {
  /** Tenant actual. Si `conTenant` es false (plataforma sin empresa elegida) es un id nulo. */
  tenantId: string;
  conTenant: boolean;
  actor: Actor;
  usuario: UsuarioContexto | null;
  /** Rol de la membresía en el tenant actual. */
  rol: Rol | null;
  /** Portal desde el que se ejecuta (telemetría). */
  portal: string | null;
  /** Módulos activos (o en trial) del tenant. `core` y `platform` siempre lo están. */
  modulosActivos: readonly string[];
  /** Módulos permitidos para un agente (scopes de la key); null = sin restricción. */
  scopes: readonly string[] | null;
  /** Principal de la API key (ADR-033). null en sesiones humanas y procesos del sistema. */
  principal: Principal | null;
  /** Cliente acotado al tenant. Única vía de acceso a datos para los handlers. */
  db: TenantDb;
  /** Transacción con el tenant fijado: cambio + evento + bitácora atómicos. Dentro, solo `tx`. */
  transaccion<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T>;
  auditoria: Auditoria;
  medidor: Medidor;
  eventos: Eventos;
  trabajos: Trabajos;
  bitacora: BitacoraServicio;
  /** Trabajo fuera de la respuesta (el borde usa `after()`). Nunca debe romper la ejecución. */
  diferir(tarea: () => Promise<unknown>): void;
  /** Pide despachar el outbox tras una escritura (el borde lo difiere). */
  despacharEventos(): void;
  servicios: Servicios;
  plataforma: Plataforma | null;
  /** Decide si el actor tiene el permiso (rol de la membresía y rol de plataforma). */
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
  /** `null` = solo requiere actor autenticado (no `system` en producción, salvo internas). */
  permiso: string | null;
  input: I;
  output: O;
  efecto: Efecto;
  /** Si acepta `dryRun`: el handler calcula y describe sin persistir. Obligatorio si efecto ≠ lectura. */
  dryRun: boolean;
  /** Interna: la usa la UI del núcleo (invitaciones), no se expone por API ni MCP. */
  interna?: boolean;
  /** No exige tenant actual (`core.me`, plataforma, flujos de invitación). */
  sinTenant?: boolean;
  /** Portales donde está disponible (ADR-033). Por defecto ["erp"] (plataforma: ["platform"]). */
  portales?: readonly string[];
  /** Tenant donde auditar y medir (plataforma: el tenant objetivo). Por defecto, el actual. */
  tenantObjetivo?: (input: z.output<I>, output: z.output<O> | undefined) => string | undefined;
  handler: (ctx: Contexto, input: z.output<I>, modo: ModoEjecucion) => Promise<z.input<O>>;
}

export type CodigoError =
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "DRY_RUN_NOT_SUPPORTED"
  | "APPROVAL_REQUIRED"
  | "BUDGET_EXCEEDED"
  | "INVALID_OUTPUT"
  | "INTERNAL";

export type Resultado<T = unknown> =
  | { ok: true; data: T; dryRun: boolean }
  | { ok: false; error: { code: CodigoError; message: string; issues?: unknown } };
