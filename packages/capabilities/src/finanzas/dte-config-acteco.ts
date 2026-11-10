// CAR-243 · `finanzas.dte_config.actualizar` acepta todavía `acteco` (MCP y pantallas anteriores), pero el dato vive en la
// configuración principal de la empresa (`core.perfil_empresa`): aquí se traduce a la lista de ACTECO de la empresa.
import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../errores";

type Actividades = { codigos: number[]; principal: number | null };

/**
 * Lista y principal que resultan de `acteco` en la configuración DTE. Sin `acteco` no cambia nada. Un número lo deja
 * como principal y lo agrega si faltaba, sin tocar los demás códigos. `null` quita el principal solo si es el único
 * código: con más, la empresa debe elegir el nuevo principal en Configuración › Empresa.
 */
export function actecoDesdeDteConfig(
  actual: Actividades,
  acteco: number | null | undefined,
): Actividades & { cambia: boolean } {
  if (acteco === undefined || acteco === actual.principal) return { ...actual, cambia: false };
  if (acteco === null) {
    if (actual.codigos.length > 1) {
      throw reglaDeNegocio(
        "La empresa tiene varios ACTECO: elige el nuevo principal o quítalos en Configuración › Empresa.",
      );
    }
    return { codigos: [], principal: null, cambia: true };
  }
  return { codigos: [acteco, ...actual.codigos.filter((c) => c !== acteco)], principal: acteco, cambia: true };
}

/** Escribe la lista en el perfil de la empresa, en la misma transacción que la configuración DTE. */
export async function escribirActecoDesdeDteConfig(tx: TenantTx, tenantId: string, a: Actividades) {
  const data = { actecos: a.codigos, actecoPrincipal: a.principal };
  await tx.perfilEmpresa.upsert({ where: { tenantId }, create: { ...data, tenantId }, update: data, select: { id: true } });
}
