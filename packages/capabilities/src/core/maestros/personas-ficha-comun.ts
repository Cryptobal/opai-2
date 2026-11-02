import { PERMISOS_CORE } from "@opai/domain";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { dondePersona } from "./alcance";
import { exigirNoAnonimizado } from "./anonimizado";

/** Persona visible en ficha laboral (alcance + no anonimizada). */
export async function personaFicha(ctx: Contexto, id: string) {
  const p = await ctx.db.persona.findFirst({
    where: { id, AND: [dondePersona(ctx)] },
    select: { id: true, tenantId: true, anonimizadaEn: true },
  });
  if (!p) throw noEncontrado("La persona");
  exigirNoAnonimizado(p, "La persona");
  return p;
}

/** Enmascara número de cuenta para quien solo tiene lectura de pago (sin manage). */
export function enmascararCuenta(numero: string | null, enmascarar: boolean): string | null {
  if (!numero) return null;
  if (!enmascarar) return numero;
  const limpio = numero.replace(/\s/g, "");
  if (limpio.length <= 4) return "****";
  return `****${limpio.slice(-4)}`;
}

/** Plan ISAPRE presente pero sin descifrar (dato de salud, R-PER-004). */
export function enmascararPlanIsapre(_planCifrado: string): string {
  return "••••";
}

/** Ver plan ISAPRE en claro solo con permiso de gestión (no por nombre de rol). */
export function enmascararPlanIsapreEnLectura(ctx: Contexto): boolean {
  return !ctx.autorizar(PERMISOS_CORE.personasPrevisionManage);
}

/** Ver número de cuenta en claro solo con permiso de gestión de pago. */
export function enmascararCuentaEnLectura(ctx: Contexto): boolean {
  return !ctx.autorizar(PERMISOS_CORE.personasPagoManage);
}
