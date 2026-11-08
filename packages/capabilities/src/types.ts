import type { EstadoMfa, Rol, RolPlataforma } from "@opai/domain";
import type { Globales, HechoPlataforma, TenantTx, VerificacionAuditoria } from "@opai/db";

import type { EmpresaPlataforma } from "./plataforma-empresa";
import type { Almacenamiento, Mailer } from "@opai/integrations";
import type { z } from "zod";

import type { Idempotencia } from "./idempotencia";
import type {
  AgenteContexto,
  BitacoraServicio,
  Eventos,
  Identidad,
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
  | { tipo: "agent"; id: string; viaUserId: string; interno?: true };

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
 * `BitacoraServicio`: el llamador decide la transacción (ADR-052) para que el insert sea
 * atómico con la escritura que audita.
 */
export interface Auditoria {
  registrar(tx: TenantTx, evento: EventoAuditoria): Promise<{ seq: number; hash: string }>;
  /** Recorre la cadena del tenant actual y registra el resultado (ADR-052). */
  verificar(signal?: AbortSignal): Promise<VerificacionAuditoria>;
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
  /**
   * Operaciones con nombre dentro de una empresa (CAR-40), con la RLS de esa empresa: nunca un
   * delegado libre, ni payloads de trabajos, hashes de keys o secretos de integraciones.
   */
  empresa(tenantId: string): EmpresaPlataforma;
  /**
   * Audita una escritura `platform.*` con `tenantObjetivo` en la auditoría de plataforma y en la
   * cadena de esa empresa, en una transacción del objetivo y siempre en ese orden (la cadena global
   * antes que la de la empresa, como al aprobar: un solo orden de locks). Lo usa solo
   * `executeCapability`; no entrega una transacción libre sobre la empresa (CAR-40).
   */
  auditarEnObjetivo(
    tenantId: string,
    hecho: HechoPlataforma,
    evento: EventoAuditoria,
  ): Promise<void>;
};

/** Contexto de ejecución. Lo construye el borde (ruta HTTP, acción de UI, MCP), nunca el módulo. */
export interface Contexto {
  /** Borde: relee sesión y acceso de la solicitud; rechaza cambios sin sustituir la transacción. */
  revalidarAccesoSolicitud?: () => Promise<string>;
  /** Garantía de MFA comprobada en el borde; nunca procede del input de una capacidad. */
  mfa?: EstadoMfa;
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
  /** Módulos activos en «solo lectura»: rechazan toda escritura (CAR-188). Subconjunto de `modulosActivos`. */
  modulosSoloLectura: readonly string[];
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
  /** Diagnósticos durables: nunca se reutiliza la transacción de la solicitud. */
  transaccionIndependiente<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T>;
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
  identidad: Identidad;
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
export type ModoEjecucion = {
  dryRun: boolean;
  idempotencyKey?: string;
  /** Lo que devolvió `preparar` de la capacidad (fuera de la transacción), si lo declara. */
  preparado?: unknown;
};

export interface Capacidad<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> {
  /** `<modulo>.<entidad>.<verbo>` o `<modulo>.<verbo>`, en minúsculas. */
  id: string;
  /** Derivado del id: el primer segmento. */
  modulo: string;
  descripcion: string;
  /** `null` = solo requiere actor autenticado (no `system` en producción, salvo internas). */
  permiso: string | null;
  /**
   * Otros permisos que también dejan ejecutar la capacidad (basta uno, o `permiso`). El handler
   * debe acotar lo que puede hacer quien solo tiene uno de estos (p. ej. subir a lo que tiene a
   * cargo). Quien tiene `permiso` conserva todo igual.
   */
  permisosAlternos?: readonly string[];
  input: I;
  output: O;
  efecto: Efecto;
  /** Si acepta `dryRun`: el handler calcula y describe sin persistir. Obligatorio si efecto ≠ lectura. */
  dryRun: boolean;
  /** Interna: la usa la UI del núcleo (invitaciones), no se expone por API ni MCP. */
  interna?: boolean;
  /** No exige tenant actual (`core.me`, plataforma, flujos de invitación). */
  sinTenant?: boolean;
  /**
   * Lectura que no consulta la base (catálogo en memoria, p. ej. `core.config.schema`): el handler
   * corre sin abrir la transacción de tenant de `enLectura`, para no pedir ni retener una conexión
   * del pool sin motivo (B1, P2028). Si pese a todo tocara `ctx.db`, cada operación abriría su propia
   * transacción con el tenant fijado (misma RLS); por eso solo se marca en lecturas sin base. Solo
   * aplica a `efecto: "lectura"` sin `auditarLectura`.
   */
  sinDb?: boolean;
  /** Campos del input que nunca se guardan en auditoría ni en aprobaciones (secretos). */
  sensibles?: readonly string[];
  /** Identificadores revelados por una lectura; nunca contenido personal ni input sin validar. */
  auditarLectura?: false | ((salida: z.output<O>, entrada: z.output<I>) => readonly string[]);
  /**
   * Versión de la salida que se guarda en la reserva de idempotencia (24 h). Para salidas con un
   * secreto de un solo uso (el token de un enlace): la repetición con la misma clave devuelve esta
   * versión, no el secreto. La respuesta de la primera ejecución no cambia.
   */
  salidaIdempotente?: (salida: z.output<O>) => z.output<O>;
  /** Revalida el acceso vigente a una respuesta idempotente sin repetir sus efectos. */
  autorizarRepeticion?: (ctx: Contexto, input: z.output<I>, salida: unknown) => Promise<void>;
  /** Nunca la ejecuta una API key (aprobaciones, autonomía y presupuesto de agentes). */
  soloPersonas?: boolean;
  /**
   * Aprobación humana condicionada al input (firma.md R19): cuando se declara, reemplaza al efecto
   * como disparador de la aprobación de un agente. Si devuelve `true`, esta llamada queda en la cola
   * de aprobación igual que una irreversible; si `false`, el agente la ejecuta directo (salvo que su
   * autonomía sea "aprobacion", que siempre la exige). Solo afecta a agentes; a las personas nunca.
   */
  exigeAprobacion?: (input: z.output<I>) => boolean;
  /** Portales donde está disponible (ADR-033). Por defecto ["erp"] (plataforma: ["platform"]). */
  portales?: readonly string[];
  /**
   * Cambio global (CAR-41): estado anterior y nuevo, a partir de la salida, para la auditoría de
   * plataforma (`antes`/`despues`). Lo declaran las escrituras `platform.*` que cambian algo de todas
   * las empresas (ajustes, precios).
   */
  cambio?: (salida: z.output<O>, entrada: z.output<I>) => { antes: unknown; despues: unknown };
  /** Tenant donde auditar y medir (plataforma: el tenant objetivo). Por defecto, el actual. */
  tenantObjetivo?: (input: z.output<I>, output: z.output<O> | undefined) => string | undefined;
  /** Campos extra en el payload de auditoría de escrituras (sin revelar la salida completa). */
  auditoriaPayload?: (ctx: Contexto, entrada: z.output<I>, salida: z.output<O>) => Record<string, unknown>;
  /**
   * Trabajo previo que llama a un servicio externo (p. ej. firmar un DTE con SimpleAPI) y por eso NO puede
   * correr dentro de la transacción de la escritura (una llamada remota lenta retendría la conexión y los
   * locks). Se ejecuta solo en la ejecución real, antes de abrir la transacción, con el contexto de la
   * solicitud (cada consulta abre su propia transacción corta). Su resultado llega al handler en
   * `modo.preparado`; el handler revalida lo que dependa de la base dentro de su transacción.
   */
  preparar?: (ctx: Contexto, input: z.output<I>) => Promise<unknown>;
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
