import type { TenantTx } from "@opai/db";

import { conflicto, reglaDeNegocio } from "../../errores";
import { aFecha } from "./comun";
import {
  MAX_PERIODOS_PLAZO_FIJO,
  periodosValidos,
  vinculoVigente,
} from "./contrato-periodos-vista";

export type NuevoPeriodo = {
  tipo: "plazo_fijo" | "indefinido";
  inicio: string;
  termino?: string | null | undefined;
};

/** Tipos de vínculo que llevan períodos (honorarios y por obra no los tienen). */
const TIPOS_CON_PERIODOS = new Set(["plazo_fijo", "indefinido"]);

/**
 * Valida un período nuevo contra la historia del contrato vigente (CAR-409): sin contrato vigente, ya
 * indefinido, más de 3 plazos fijos, o un inicio que no viene después del término anterior.
 */
export async function planearPeriodo(tx: TenantTx, personaId: string, p: NuevoPeriodo) {
  const v = await vinculoVigente(tx, personaId);
  if (!v) throw conflicto("La persona no tiene un contrato vigente.");
  if (!TIPOS_CON_PERIODOS.has(v.tipo)) {
    throw reglaDeNegocio("Los contratos a honorarios o por obra no llevan períodos de plazo fijo.");
  }
  const previos = await periodosValidos(tx, v.id);
  const ultimo = previos.at(-1);
  if (ultimo?.tipo === "indefinido") throw conflicto("El contrato ya es indefinido.");
  const inicio = aFecha(p.inicio);
  if (inicio < v.inicio)
    throw reglaDeNegocio("El período no puede empezar antes del inicio del contrato.");
  if (ultimo?.termino && inicio <= ultimo.termino) {
    throw reglaDeNegocio("El período debe empezar después del término del período anterior.");
  }
  const plazos = previos.filter((x) => x.tipo === "plazo_fijo").length;
  if (p.tipo === "plazo_fijo" && plazos >= MAX_PERIODOS_PLAZO_FIJO) {
    throw reglaDeNegocio(
      `Ya hay ${MAX_PERIODOS_PLAZO_FIJO} períodos de plazo fijo: el siguiente es indefinido.`,
    );
  }
  return {
    vinculo: v,
    inicio,
    termino: p.tipo === "plazo_fijo" && p.termino ? aFecha(p.termino) : null,
  };
}

/** El tipo del contrato sigue a su historia: el del último período válido. */
export async function sincronizarTipoVinculo(tx: TenantTx, vinculoId: string, tipoActual: string) {
  const ultimo = (await periodosValidos(tx, vinculoId)).at(-1);
  if (ultimo && ultimo.tipo !== tipoActual) {
    await tx.vinculoLaboral.update({ where: { id: vinculoId }, data: { tipo: ultimo.tipo } });
  }
}
