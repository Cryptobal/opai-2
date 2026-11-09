import {
  catalogoNovedades,
  ETIQUETA_MODULO_NOVEDAD,
  novedadesVisibles,
  type EntradaNovedad,
} from "@opai/domain";

import { enScope } from "../../autorizacion";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

export function usuarioDe(ctx: Contexto): string {
  if (ctx.actor.tipo !== "user") throw reglaDeNegocio("Las novedades son de usuarios con sesión.");
  return ctx.actor.id;
}

export function entradasPara(ctx: Contexto): EntradaNovedad[] {
  const esPlataforma =
    enScope(ctx, "platform") &&
    Boolean(ctx.usuario?.platformRole);
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
