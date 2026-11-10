import {
  catalogoNovedades,
  ETIQUETA_MODULO_NOVEDAD,
  novedadesVisibles,
  type EntradaNovedad,
} from "@opai/domain";

import { forTenantUsuario, validarTenantId } from "@opai/db";

import { enScope } from "../../autorizacion";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

/**
 * `permiso: null` en las cuatro capacidades (igual que `core.notificaciones.list`): bandeja propia
 * del usuario con sesión. El acceso se acota por portal, actor tipo `user`, módulos activos del
 * tenant y permisos opcionales por entrada en el catálogo; no hay un permiso de catálogo global.
 */
export async function dbLecturaNovedades(ctx: Contexto) {
  const usuarioId = usuarioDe(ctx);
  // executeCapability ya fijó app.tenant_id en esta transacción, no app.user_id.
  // Sin el usuario, la política restrictiva de novedades_lectura no deja ver ni insertar:
  // «Marcar todas como leídas» responde error y la lista sigue igual (CAR-232).
  if ("$executeRaw" in ctx.db && !("$extends" in ctx.db)) {
    const uid = validarTenantId(usuarioId);
    await ctx.db.$executeRaw`SELECT set_config('app.user_id', ${uid}, true)`;
    return ctx.db;
  }
  // Base en memoria de tests: sin set_config ni RLS; el handler filtra por usuarioId.
  if (!("$extends" in ctx.db)) return ctx.db;
  return forTenantUsuario(ctx.tenantId, usuarioId);
}

export function usuarioDe(ctx: Contexto): string {
  if (ctx.actor.tipo !== "user") throw reglaDeNegocio("Las novedades son de usuarios con sesión.");
  return ctx.actor.id;
}

export function entradasPara(ctx: Contexto): EntradaNovedad[] {
  const esPlataforma = enScope(ctx, "platform") && Boolean(ctx.usuario?.platformRole);
  return novedadesVisibles(
    catalogoNovedades(),
    ctx.modulosActivos,
    (p) => ctx.autorizar(p),
    esPlataforma,
  );
}

export function etiquetaModulo(modulo: string): string {
  return ETIQUETA_MODULO_NOVEDAD[modulo] ?? modulo;
}
