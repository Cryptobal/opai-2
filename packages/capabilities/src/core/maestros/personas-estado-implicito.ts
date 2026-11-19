import {
  puedeTransicionarPersona,
  type EstadoPersona,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

type TxPersona = Pick<TenantTx, "persona">;

import { reglaDeNegocio } from "../../errores";

const BLOQUEADOS_VINCULO = new Set(["bloqueado_permanente", "rechazado"]);
const NO_ARCHIVABLE = new Set(["bloqueado_permanente"]);

export type PersonaOperable = {
  estado: string | null;
  archivadaEn: Date | null;
  bloqueada: boolean;
  anonimizadaEn?: Date | null;
};

export function exigirPersonaOperableVinculo(p: PersonaOperable, etiqueta = "La persona"): void {
  if (p.anonimizadaEn) throw reglaDeNegocio(`${etiqueta} está anonimizada.`);
  if (p.archivadaEn) throw reglaDeNegocio("La persona está archivada.");
  if (p.bloqueada) throw reglaDeNegocio(`${etiqueta} está bloqueada (operativa): desbloquéala antes.`);
  const est = p.estado ?? "activo";
  if (BLOQUEADOS_VINCULO.has(est)) {
    throw reglaDeNegocio(`Una persona en «${est}» no puede tener un vínculo laboral nuevo.`);
  }
}

export function exigirArchivoPersona(desde: string): void {
  if (NO_ARCHIVABLE.has(desde)) {
    throw reglaDeNegocio(`Una persona en «${desde}» no puede archivarse.`);
  }
}

/** Archivar fija `inactivo` + `archivadaEn` desde cualquier estado archivable (como antes de CAR-674). */
export async function archivarPersonaEnTx(
  tx: TxPersona,
  personaId: string,
  desde: string,
  archivadaEn: Date,
): Promise<void> {
  exigirArchivoPersona(desde);
  const origen = desde || "activo";
  const { count } = await tx.persona.updateMany({
    where: { id: personaId, estado: origen, archivadaEn: null },
    data: { estado: "inactivo", archivadaEn },
  });
  if (count === 0) {
    throw reglaDeNegocio("El estado de la persona cambió: vuelve a abrir la operación.");
  }
}

export function exigirTransicionPersonaPermitida(desde: string, hacia: EstadoPersona): void {
  if (BLOQUEADOS_VINCULO.has(desde)) {
    throw reglaDeNegocio(`Una persona en «${desde}» no puede pasar a «${hacia}».`);
  }
  if (!puedeTransicionarPersona(desde, hacia)) {
    throw reglaDeNegocio(`Una persona en «${desde}» no puede pasar a «${hacia}».`);
  }
}

/** Actualiza el estado solo si sigue en `desde`; falla si la transición no es válida. */
export async function transicionarPersonaEnTx(
  tx: TxPersona,
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