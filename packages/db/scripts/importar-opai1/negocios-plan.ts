// Plan de negocios (CrmDeal → comercial.negocios). Etapas vía equivalencia aprobada por tenant.
import {
  type Aviso,
  type Decision,
  decision,
  decisionMapeada,
  indiceIds,
  ordenEstable,
} from "./comun";
import { camposCompletarVacios } from "./completar-vacios";
import type { CuentaResuelta } from "./cuentas";
import type { EstadoDestino } from "./destino-tipos";
import {
  cargarEquivalenciaEtapas,
  etapasSinMapearEnHistorial,
  resolverEtapaNegocio,
  type EquivalenciaEtapas,
} from "./etapas-equivalencia";
import { mapearMotivoPerdida } from "./comercial-pendiente";
import { textoLimpio } from "./normalizar";
import type { DatosOpai1, NegocioOpai1 } from "./origen";

export type DatosNegocio = {
  cuentaId: string;
  etapaId: string;
  titulo: string;
  montoEstimadoMensual: number | null;
  probabilidad: number;
  cierreEstimado: string | null;
  cotizacionEnviadaEn: string | null;
};

export type PlanNegocios = {
  decisiones: Decision<DatosNegocio>[];
  avisos: Aviso[];
  etapasSinMapear: string[];
  negociosIncompletos: string[];
};

type Resolver = (id: string | null | undefined) => CuentaResuelta | null | undefined;

export function planNegocios(
  origen: DatosOpai1,
  resolver: Resolver,
  destino: EstadoDestino,
  tenantSlug: string,
): PlanNegocios {
  const equivalencia = cargarEquivalenciaEtapas(tenantSlug);
  const etapas1 = new Map(origen.pipelineStages.map((e) => [e.id, e]));
  const etapas1Ids = new Set(origen.pipelineStages.map((e) => e.id));
  const etapasSinMapear = etapasSinMapearEnHistorial(
    origen.dealStageHistory,
    equivalencia,
    etapas1Ids,
  );
  const ids = indiceIds(destino, "negocio");
  const actuales = new Map(destino.negocios.map((n) => [n.id, n]));
  const decisiones: Decision<DatosNegocio>[] = [];
  const avisos: Aviso[] = [];
  const negociosIncompletos: string[] = [];

  for (const f of ordenEstable(origen.deals)) {
    const cuenta = resolver(f.accountId);
    if (!cuenta || cuenta === null) {
      decisiones.push(decision("negocio", f.id, "omitido", { motivo: "cuenta_no_resuelta" }));
      continue;
    }
    const etapa = resolverEtapaNegocio(f, equivalencia, etapas1);
    if ("error" in etapa) {
      decisiones.push(decision("negocio", f.id, "conflicto", { motivo: etapa.error }));
      continue;
    }
    const datos = datosNegocio(f, cuenta.clave, etapa.etapaId2);
    if (datos.montoEstimadoMensual === null || !datos.cierreEstimado) negociosIncompletos.push(f.id);
    const { desconocido } = mapearMotivoPerdida(f.lostReasonCategory);
    if (desconocido) avisos.push({ codigo: "motivo_perdida_desconocido", idOpai1: f.id });
    const mapeado = ids.porExterno.get(f.id);
    if (mapeado) {
      const actual = actuales.get(mapeado);
      const { conflictos, campos } = camposCompletarVacios(datos, actual ?? {});
      if (conflictos.length > 0)
        decisiones.push(
          decision("negocio", f.id, "conflicto", {
            motivo: "conflicto_completar_vacios",
            destinoId: mapeado,
            campos: conflictos,
          }),
        );
      else if (campos.length === 0)
        decisiones.push(decision("negocio", f.id, "sin_cambios", { destinoId: mapeado, datos }));
      else
        decisiones.push(
          decision("negocio", f.id, "actualizar", {
            destinoId: mapeado,
            campos,
            datos,
            motivo: "completar_vacios",
          }),
        );
    } else decisiones.push(decision("negocio", f.id, "crear", { datos }));
  }
  return { decisiones, avisos, etapasSinMapear, negociosIncompletos };
}

function datosNegocio(f: NegocioOpai1, cuentaClave: string, etapaId: string): DatosNegocio {
  return {
    cuentaId: cuentaClave,
    etapaId,
    titulo: textoLimpio(f.title) ?? f.title,
    montoEstimadoMensual: f.amount ?? null,
    probabilidad: f.probability ?? 0,
    cierreEstimado: f.expectedCloseDate ?? null,
    cotizacionEnviadaEn: f.proposalSentAt ?? null,
  };
}

/** Bloquea aplicar si hay etapas sin equivalencia confirmada. */
export function bloquearAplicarPorEtapas(etapasSinMapear: readonly string[]): boolean {
  return etapasSinMapear.length > 0;
}

export type { EquivalenciaEtapas };
