// Motor común de importación (CAR-279): contrato que implementa cada importador de un módulo.
// El motor lee la planilla, resuelve el mapeo, valida, arma el plan, lo aplica como un lote reversible
// (`core.importaciones` + `core.importaciones_filas`) y lo deja en la auditoría. Cada importador solo
// dice qué campos acepta, cómo reconoce un registro que ya existe y cómo escribe el suyo.
import type { TenantTx } from "@opai/db";
import type { DefinicionImportador, FilaNormalizada } from "@opai/domain/importacion";

import type { Contexto } from "../../types";

export const VERSION_MOTOR = "motor-archivo/v1";
/** Sistema de los ids externos de una planilla común; el adaptador de OPAI 1 usa «opai1». */
export const SISTEMA_ARCHIVO = "archivo";
export const AL_EXISTIR = ["completar", "sobrescribir", "omitir"] as const;
export type AlExistir = (typeof AL_EXISTIR)[number];

export type Escalar = string | number | boolean | Date | null;
export type Datos = Record<string, Escalar | readonly string[]>;

export type AccionPlan = "crear" | "actualizar" | "sin_cambio" | "error";

/** Lo que el importador decide para una fila válida de la planilla. */
export type FilaPlan<D extends Datos> = {
  fila: number;
  /** Clave natural estable (RUT, id externo, cuenta + correo…): identifica la fila en el lote. */
  clave: string;
  /** Texto corto para la vista previa (nombre de la cuenta, del contacto…). */
  etiqueta: string;
  accion: AccionPlan;
  mensajes: string[];
  /** Registro existente que calza (para actualizar o dejar igual). */
  existente?: { id: string } & Record<string, unknown>;
  /** Datos completos para crear, o base para calcular qué completar en el existente. */
  datos?: D;
  /** Id del registro en el sistema de origen, si la planilla lo trae. */
  idExterno?: string | null;
};

export type OpcionesPlan = { alExistir: AlExistir; sistema: string };

export type Importador<D extends Datos = Datos> = {
  def: DefinicionImportador;
  /** Tipo de entidad en `core.ids_externos` y `core.importaciones_filas`. */
  entidad: string;
  /** Permiso sobre la entidad, además del permiso de importar. */
  permiso: string;
  /** Módulo que debe estar activo (los maestros del núcleo no lo exigen). */
  modulo?: string;
  /** Campos que se guardan como texto y se pueden completar o sobrescribir en un registro existente. */
  actualizables: readonly (keyof D & string)[];
  planificar(ctx: Contexto, filas: readonly FilaNormalizada[], o: OpcionesPlan): Promise<FilaPlan<D>[]>;
  crear(tx: TenantTx, ctx: Contexto, datos: D): Promise<string>;
  /** `ctx` llega siempre; lo usan los importadores que cifran campos (la cuenta bancaria de Personas). */
  actualizar(tx: TenantTx, id: string, cambios: Partial<D>, ctx: Contexto): Promise<void>;
  /** Para revertir: estado actual de los registros que todavía existen. */
  actuales(tx: TenantTx, ids: readonly string[]): Promise<({ id: string; updatedAt: Date } & Record<string, unknown>)[]>;
  /** Para revertir: por qué no se puede borrar cada registro (tiene dependientes); sin entrada = se puede. */
  bloqueos(tx: TenantTx, ids: readonly string[]): Promise<Map<string, string>>;
  borrar(tx: TenantTx, ids: readonly string[]): Promise<void>;
};

export type FilaReporte = {
  fila: number;
  accion: AccionPlan;
  etiqueta: string;
  mensajes: string[];
  /** Campos que cambiarían en el registro existente. */
  cambios: string[];
};

export type Conteos = Record<AccionPlan, number>;
