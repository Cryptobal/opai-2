// Equivalencia de etapas 1.0 → 2.0 por tenant (ids, sin datos personales). Aprobada por Carlos, 3-nov-2026.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { EtapaOpai1, HistorialEtapaOpai1, NegocioOpai1 } from "./origen";
import type { EtapaMapeada, TipoEtapa } from "./comercial-pendiente";

export const ETAPA_PERDIDO_2 = "01a1839d-4893-72c8-9ef2-ad39950c50b1";
export const ETAPA_ADJUDICADO_2 = "01a1839d-486d-75ba-ae40-321733b40b70";

export type EquivalenciaEtapas = Readonly<Record<string, string>>;

const dirConfig = join(dirname(fileURLToPath(import.meta.url)), "config");

/** Carga la tabla del tenant; vacía si no hay archivo (simular muestra etapas sin mapear). */
export function cargarEquivalenciaEtapas(tenantSlug: string): EquivalenciaEtapas {
  const ruta = join(dirConfig, `equivalencia-etapas.${tenantSlug}.json`);
  try {
    const crudo = JSON.parse(readFileSync(ruta, "utf8")) as Record<string, string>;
    return crudo;
  } catch {
    return {};
  }
}

export type EtapaNegocioResuelta =
  | { etapaId2: string; revisar: false }
  | { error: "etapa_sin_mapeo" | "closed_en_etapa_abierta" | "etapa_ambigua" };

export function resolverEtapaNegocio(
  deal: Pick<NegocioOpai1, "stageId" | "status">,
  equivalencia: EquivalenciaEtapas,
  etapas1: ReadonlyMap<string, EtapaOpai1>,
): EtapaNegocioResuelta {
  const status = (deal.status ?? "open").trim().toLowerCase();
  if (status === "lost") return { etapaId2: ETAPA_PERDIDO_2, revisar: false };
  if (status === "won") return { etapaId2: ETAPA_ADJUDICADO_2, revisar: false };
  if (status === "closed") {
    const e1 = etapas1.get(deal.stageId);
    if (e1 && !e1.isClosedWon && !e1.isClosedLost) return { error: "closed_en_etapa_abierta" };
  }
  const etapaId2 = equivalencia[deal.stageId];
  if (!etapaId2) return { error: "etapa_sin_mapeo" };
  return { etapaId2, revisar: false };
}

/** Ids de etapa en historial que no están en la tabla de equivalencia ni en pipelineStages. */
export function etapasSinMapearEnHistorial(
  historial: readonly HistorialEtapaOpai1[],
  equivalencia: EquivalenciaEtapas,
  etapas1Ids: ReadonlySet<string>,
): string[] {
  const desconocidos = new Set<string>();
  for (const h of historial) {
    for (const id of [h.fromStageId, h.toStageId]) {
      if (!id || etapas1Ids.has(id) || equivalencia[id]) continue;
      desconocidos.add(id);
    }
  }
  return [...desconocidos].sort();
}

/** @deprecated Usar equivalencia por tenant. Conservado para tests del mapeo 1:1 de etapas nuevas. */
export function mapearEtapaLegacy(e: EtapaOpai1): EtapaMapeada | { error: "etapa_ambigua" } {
  if (e.isClosedWon && e.isClosedLost) return { error: "etapa_ambigua" };
  const tipo: TipoEtapa = e.isClosedWon ? "ganada" : e.isClosedLost ? "perdida" : "abierta";
  return {
    nombre: e.name.trim(),
    orden: e.order,
    tipo,
    exige: e.isAccepted ? ["inicio_servicio"] : [],
  };
}
