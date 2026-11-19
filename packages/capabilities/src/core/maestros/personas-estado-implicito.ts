import {
  puedeTransicionarPersona,
  type EstadoPersona,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../../errores";

const BLOQUEADOS = new Set(["bloqueado_permanente", "rechazado"]);

export function exigirTransicionPersonaPermitida(desde: string, hacia: EstadoPersona): void {
  if (BLOQUEADOS.has(desde)) {
    throw reglaDeNegocio(`Una persona en «${desde}» no puede pasar a «${hacia}».`);
  }
  if (!puedeTransicionarPersona(desde, hacia)) {
    throw reglaDeNegocio(`Una persona en «${desde}» no puede pasar a «${hacia}».`);
  }
}

/** Actualiza el estado solo si sigue en `desde`; falla si la transición no es válida. */
export async function transicionarPersonaEnTx(
  tx: TenantTx,
  personaId: string,
  hacia: EstadoPersona,
  desde: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const origen = desde || "activo";
  if (origen === hacia) return;
  exigirTransicionPersonaPermitida(origen, hacia);
  const { count } = await tx.persona.updateMany({
    where: { id: personaId, estado: origen },
    data: { estado: hacia, ...extra },
  });
  if (count === 0) {
    throw reglaDeNegocio("El estado de la persona cambió: vuelve a abrir la operación.");
  }
}