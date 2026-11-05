import { PERMISOS_CORE } from "@opai/domain";

import { noEncontrado, prohibido } from "../../errores";
import type { Contexto } from "../../types";
import type { Entidad } from "./entidad";

/**
 * Subida acotada (CAR-182, decisión de Carlos del 4-nov-2026): el actor tiene
 * `core:documentos.subir_alcance` pero no `core:documentos.manage`. Quien tiene `manage` no pasa por
 * aquí y conserva todo igual. Se llama solo después de que `executeCapability` autorizó (permiso o
 * alterno): si no tiene `manage`, entonces entró por el alterno. No es un chequeo de acceso por sí
 * mismo, y no debe usarse antes de autorizar.
 */
export const subidaAcotada = (ctx: Contexto): boolean =>
  !ctx.autorizar(PERMISOS_CORE.documentosManage);

/**
 * Un actor de subida acotada solo sube a una instalación que tiene a cargo (ADR-022: se compara con
 * `ctx.alcance` en el servidor, no en la UI). Todo lo demás (empresa, cuenta, persona, puesto, o
 * versionar un documento) es el mismo rechazo que antes de existir el permiso. Una instalación fuera
 * de su alcance y una que no existe dan el mismo «no encontrado», sin revelar cuál es. Sin alcance
 * (ve todo el tenant) tampoco sube: este permiso no existe para ese caso.
 */
export function exigirDestinoAcotado(ctx: Contexto, e: Entidad, reemplazaAId?: string): void {
  if (e.tipo !== "instalacion" || reemplazaAId) throw prohibido("Sin permiso para esta capacidad.");
  if (!ctx.alcance?.instalaciones.includes(e.id)) throw noEncontrado(`La entidad ${e.tipo}`);
}

/** Visibilidad en portales de un documento subido de forma acotada: ninguno (la más restrictiva). */
export const VISIBILIDAD_ACOTADA: readonly string[] = Object.freeze([]);
