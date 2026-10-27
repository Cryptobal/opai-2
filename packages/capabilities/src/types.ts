import type { Rol, RolPlataforma } from "@opai/domain";
import type { Globales, TenantDb, TenantTx, VerificacionAuditoria } from "@opai/db";
import type { Almacenamiento, Mailer } from "@opai/integrations";
import type { z } from "zod";

import type { Idempotencia } from "./idempotencia";
import type {
  AgenteContexto,
  BitacoraServicio,
  Eventos,
  Medidor,
  Principal,
  Trabajos,
} from "./servicios-tipos";

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

/**
 * Auditoría en `core.audit_events`, encadenada por tenant. Recibe `tx` como `Eventos`/`Trabajos`/
 * `BitacoraServicio`: el llamador decide la transacción (ADR-023-bis) para que el insert sea
 * atómico con la escritura que audita.
 */
export interface Auditoria {
  registrar(tx: TenantTx, evento: EventoAuditoria): Promise<{ seq: number; hash: string }>;
  /** Recorre la cadena del tenant actual y registra el resultado (ADR-023-bis). */
  verificar(): Promise<VerificacionAuditoria>;
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
  /** Almacenamiento de archivos (R2) con URLs firmadas. */
  almacenamiento: Almacenamiento;
  /** URL pública de la app, para enlaces en correos ("https://test.opai.cl"). */
  urlBase: string;
};

/**
 * Alcance por filas del actor (ADR-022, Brief 07c B3). Presente solo cuando su rol acota por filas
 * (supervisor); `null` = ve todo el tenant (owner, admin, gerente). El filtro se aplica en la
 * consulta de cada capacidad, nunca en la UI. Una API key hereda el alcance de su usuario (ADR-033).
 */
export type Alcance = {
  /** Instalaciones a cargo. Vacío = no ve ninguna entidad (denegar por defecto). */
  instalaciones: readonly string[];
};

/** Acceso de plataforma: solo existe si el usuario tiene `platformRole` (ADR-016). */
export type Plataforma = {
  globales: Globales;
  /** Cliente acotado al tenant objetivo. Nunca consultas cross-tenant en una sola query. */
  paraTenant(tenantId: string): TenantDb;
  /**
   * Transacción atómica sobre un tenant objetivo distinto del actual (capacidades `platform.*`
   * sin tenant propio). La usa `executeCapability` para auditar en la misma transacción las
   * escrituras de plataforma que afectan a un tenant resuelto por `tenantObjetivo`.
   */
  transaccionPara<T>(tenantId: string, fn: (tx: TenantTx) => Promise<T>): Promise<T>;
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
  /** Portal solicitado: en sesiones con tenant se valida contra la membresía y la capacidad. */
  portal: string | null;
  /** Portales de la membresía activa en el tenant actual, cargados solo por el servidor. */
  portalesMembresia: readonly string[];
  /** Módulos activos (o en trial) del tenant. `core` y `platform` siempre lo están. */
  modulosActivos: readonly string[];
  /** Módulos permitidos para un agente (scopes de la key); null = sin restricción. */
  scopes: readonly string[] | null;
  /** Principal de la API key (ADR-033). null en sesiones humanas y procesos del sistema. */
  principal: Principal | null;
  /** Alcance por filas (ADR-022); null = ve todo el tenant. Se resuelve una vez por contexto. */
  alcance: Alcance | null;
  /** Presupuesto y autonomía de la API key; null en sesiones humanas y procesos del sistema. */
  agente: AgenteContexto | null;
  /** Cliente acotado al tenant. Única vía de acceso a datos para los handlers. */
  db: TenantTx;
  /** Transacción con el tenant fijado: cambio + evento + bitácora atómicos. Dentro, solo `tx`. */
  transaccion<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T>;
  /**
   * Ejecuta un bloque de solo lectura en UNA sola transacción con el tenant fijado una vez (ADR-045):
   * `executeCapability` envuelve así a las capacidades de lectura con empresa para no abrir una
   * transacción por consulta, sin debilitar la RLS. Lo implementa el borde real; sin él (contextos de
   * prueba) o sin empresa actual, el handler corre con `db` tal cual.
   */
  enLectura?<T>(fn: (db: TenantTx) => Promise<T>): Promise<T>;
  auditoria: Auditoria;
  medidor: Medidor;
  eventos: Eventos;
  trabajos: Trabajos;
  bitacora: BitacoraServicio;
  /** Claves de idempotencia de escrituras (ADR-034). */
  idempotencia: Idempotencia;
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
  /**
   * Clave de idempotencia (agentes): en escrituras reales, la misma clave con el mismo input
   * devuelve el resultado original sin repetir el efecto durante 24 h; con otro input, CONFLICT.
   */
  idempotencyKey?: string;
  /** Datos extra para la auditoría (p. ej. la aprobación y la key que la originó). */
  auditoriaExtra?: Record<string, unknown>;
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
  /** Campos del input que nunca se guardan en auditoría ni en aprobaciones (secretos). */
  sensibles?: readonly string[];
  /** Nunca la ejecuta una API key (aprobaciones, autonomía y presupuesto de agentes). */
  soloPersonas?: boolean;
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
  | { ok: true; data: T; dryRun: boolean; repetida?: true }
  | {
      ok: false;
      error: {
        code: CodigoError;
        message: string;
        issues?: unknown;
        aprobacionId?: string;
        detalles?: unknown;
      };
    };
