// Plan de embudo comercial (etapas, negocios, historial, contactos del negocio) en dry-run.
// La carga real a `comercial.*` queda fuera de `aplicar.ts` hasta el PR de apply CRM.
import { type Aviso, type Decision, decision, indiceIds, ordenEstable } from "./comun";
import {
  COMERCIAL_EN_MAIN,
  instalacionesDeNegocio,
  mapearMotivoPerdida,
  MOTIVO_EXPORT_CPQ_INCOMPLETO,
} from "./comercial-pendiente";
import { planEtapas } from "./comercial-plan-etapas";
import { planContactosNegocio, planHistorial } from "./comercial-plan-historial";
import {
  type DatosEtapa,
  type DatosNegocio,
  etapaUtilizable,
  type PlanComercial,
  type ResolverId,
  type DatosCotizacion,
} from "./comercial-plan-tipos";
export type * from "./comercial-plan-tipos";
import type { EstadoDestino } from "./destino-tipos";
import { modulosDelPlan, type OpcionesPlan } from "./opciones";
import type {
  CotizacionOpai1,
  DatosOpai1,
  NegocioOpai1,
} from "./origen";
import { textoLimpio } from "./normalizar";

function planNegocios(
  filas: readonly NegocioOpai1[],
  instalaciones: DatosOpai1["installations"],
  etapas: Map<string, Decision<DatosEtapa>>,
  resolverCuenta: ResolverId,
  destino: EstadoDestino,
): { decisiones: Decision<DatosNegocio>[]; avisos: Aviso[]; porIdOpai1: Map<string, Decision<DatosNegocio>> } {
  const ids = indiceIds(destino, "negocio");
  const decisiones: Decision<DatosNegocio>[] = [];
  const avisos: Aviso[] = [];
  const porIdOpai1 = new Map<string, Decision<DatosNegocio>>();

  for (const n of ordenEstable(filas)) {
    const cuentaId = resolverCuenta(n.accountId);
    if (!cuentaId) {
      decisiones.push(decision<DatosNegocio>("negocio", n.id, "omitido", { motivo: "sin_cuenta" }));
      porIdOpai1.set(n.id, decisiones[decisiones.length - 1]!);
      continue;
    }
    if (!etapaUtilizable(etapas.get(n.stageId))) {
      decisiones.push(decision<DatosNegocio>("negocio", n.id, "omitido", { motivo: "etapa_invalida" }));
      porIdOpai1.set(n.id, decisiones[decisiones.length - 1]!);
      continue;
    }
    const inst = instalacionesDeNegocio(n, instalaciones);
    if (inst.via === "ambigua") {
      decisiones.push(decision<DatosNegocio>("negocio", n.id, "omitido", { motivo: "instalacion_ambigua" }));
      avisos.push({ codigo: "instalacion_ambigua", idOpai1: n.id });
      porIdOpai1.set(n.id, decisiones[decisiones.length - 1]!);
      continue;
    }
    if (inst.via === "sin_coincidencia" && n.installationName) {
      decisiones.push(
        decision<DatosNegocio>("negocio", n.id, "omitido", { motivo: "instalacion_sin_coincidencia" }),
      );
      porIdOpai1.set(n.id, decisiones[decisiones.length - 1]!);
      continue;
    }
    const perdida = mapearMotivoPerdida(n.lostReasonCategory);
    if (perdida.desconocido) avisos.push({ codigo: "motivo_perdida_desconocido", idOpai1: n.id });

    const datos: DatosNegocio = {
      cuentaId,
      etapaIdOpai1: n.stageId,
      titulo: textoLimpio(n.title) ?? n.title,
      instalacionIdsOpai1: inst.ids,
    };
    const destinoId = ids.porExterno.get(n.id);
    if (destinoId)
      decisiones.push(decision<DatosNegocio>("negocio", n.id, "sin_cambios", { destinoId, datos }));
    else decisiones.push(decision<DatosNegocio>("negocio", n.id, "crear", { datos }));
    porIdOpai1.set(n.id, decisiones[decisiones.length - 1]!);
  }
  return { decisiones, avisos, porIdOpai1 };
}

function planCotizaciones(filas: readonly CotizacionOpai1[]): Decision<DatosCotizacion>[] {
  return ordenEstable(filas).map((q) =>
    decision<DatosCotizacion>("cotizacion", q.id, "omitido", {
      motivo: MOTIVO_EXPORT_CPQ_INCOMPLETO,
      datos: { code: q.code, createdAt: q.createdAt },
    }),
  );
}

export function planComercial(
  origen: DatosOpai1,
  destino: EstadoDestino,
  opciones: OpcionesPlan,
  resolverCuenta: ResolverId,
  resolverContacto: ResolverId,
): PlanComercial {
  const vacio: PlanComercial = {
    etapas: [],
    negocios: [],
    historial: [],
    contactosNegocio: [],
    cotizaciones: [],
    avisos: [],
  };
  const { comercial, cpq } = modulosDelPlan(opciones);
  if (!comercial || !COMERCIAL_EN_MAIN) return vacio;

  const et = planEtapas(origen.pipelineStages, destino);
  const neg = planNegocios(
    origen.deals,
    origen.installations,
    et.porIdOpai1,
    resolverCuenta,
    destino,
  );
  const historial = planHistorial(origen.dealStageHistory, neg.porIdOpai1, et.porIdOpai1, destino);
  const contactosNegocio = planContactosNegocio(
    origen.dealContacts,
    neg.porIdOpai1,
    resolverContacto,
    destino,
  );
  const cotizaciones = cpq ? planCotizaciones(origen.cpqQuotes) : [];

  return {
    etapas: et.decisiones,
    negocios: neg.decisiones,
    historial,
    contactosNegocio,
    cotizaciones,
    avisos: [...et.avisos, ...neg.avisos],
  };
}
