// Plan de embudo comercial (etapas, negocios, historial, contactos del negocio) en dry-run.
// La carga real a `comercial.*` queda fuera de `aplicar.ts` hasta el PR de apply CRM.
import { type Aviso, type Decision, decision, indiceIds, ordenEstable } from "./comun";
import {
  COMERCIAL_EN_MAIN,
  instalacionesDeNegocio,
  mapearEtapa,
  mapearMotivoPerdida,
  mapearRolNegocioContacto,
  MOTIVO_EXPORT_CPQ_INCOMPLETO,
} from "./comercial-pendiente";
import type { EstadoDestino } from "./destino-tipos";
import { modulosDelPlan, type OpcionesPlan } from "./opciones";
import type {
  CotizacionOpai1,
  DatosOpai1,
  EtapaOpai1,
  HistorialEtapaOpai1,
  NegocioContactoOpai1,
  NegocioOpai1,
} from "./origen";
import { textoLimpio } from "./normalizar";

export type DatosEtapa = {
  nombre: string;
  orden: number;
  tipo: string;
  exige: string[];
};

export type DatosNegocio = {
  cuentaId: string;
  etapaIdOpai1: string;
  titulo: string;
  instalacionIdsOpai1: string[];
};

export type DatosHistorialEtapa = {
  negocioIdOpai1: string;
  desdeEtapaIdOpai1: string | null;
  haciaEtapaIdOpai1: string;
  cuando: string;
};

export type DatosNegocioContacto = {
  negocioIdOpai1: string;
  contactoId: string;
  rol: string;
  esPrincipal: boolean;
};

export type DatosCotizacion = { code: string; createdAt: string };

export type PlanComercial = {
  etapas: Decision<DatosEtapa>[];
  negocios: Decision<DatosNegocio>[];
  historial: Decision<DatosHistorialEtapa>[];
  contactosNegocio: Decision<DatosNegocioContacto>[];
  cotizaciones: Decision<DatosCotizacion>[];
  avisos: Aviso[];
};

type ResolverId = (idOpai1: string) => string | null;

function ordenPorId<T extends { id: string }>(filas: readonly T[]): T[] {
  return [...filas].sort((a, b) => a.id.localeCompare(b.id));
}

function planEtapas(
  filas: readonly EtapaOpai1[],
  destino: EstadoDestino,
): { decisiones: Decision<DatosEtapa>[]; avisos: Aviso[]; porIdOpai1: Map<string, Decision<DatosEtapa>> } {
  const ids = indiceIds(destino, "etapa");
  const decisiones: Decision<DatosEtapa>[] = [];
  const avisos: Aviso[] = [];
  const porIdOpai1 = new Map<string, Decision<DatosEtapa>>();

  for (const e of ordenPorId(filas)) {
    const m = mapearEtapa(e);
    if ("error" in m) {
      const d = decision<DatosEtapa>("etapa", e.id, "omitido", { motivo: m.error });
      decisiones.push(d);
      porIdOpai1.set(e.id, d);
      avisos.push({ codigo: "etapa_ambigua", idOpai1: e.id });
      continue;
    }
    const datos: DatosEtapa = { nombre: m.nombre, orden: m.orden, tipo: m.tipo, exige: m.exige };
    const destinoId = ids.porExterno.get(e.id);
    if (destinoId)
      decisiones.push(
        decision<DatosEtapa>("etapa", e.id, "sin_cambios", { destinoId, datos }),
      );
    else decisiones.push(decision<DatosEtapa>("etapa", e.id, "crear", { datos }));
    porIdOpai1.set(e.id, decisiones[decisiones.length - 1]!);
  }
  return { decisiones, avisos, porIdOpai1 };
}

function etapaUtilizable(d: Decision<DatosEtapa> | undefined): boolean {
  return d !== undefined && d.accion !== "omitido" && d.accion !== "conflicto";
}

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

function negocioImportable(d: Decision<DatosNegocio> | undefined): boolean {
  return d !== undefined && (d.accion === "crear" || d.accion === "sin_cambios" || d.accion === "actualizar");
}

function planHistorial(
  filas: readonly HistorialEtapaOpai1[],
  negocios: Map<string, Decision<DatosNegocio>>,
  etapas: Map<string, Decision<DatosEtapa>>,
  destino: EstadoDestino,
): Decision<DatosHistorialEtapa>[] {
  const ids = indiceIds(destino, "negocio_etapa");
  const decisiones: Decision<DatosHistorialEtapa>[] = [];

  for (const h of ordenEstable(
    filas.map((x) => ({ ...x, createdAt: x.changedAt })),
  )) {
    if (!negocioImportable(negocios.get(h.dealId))) {
      decisiones.push(
        decision<DatosHistorialEtapa>("negocio_etapa", h.id, "omitido", { motivo: "negocio_no_importable" }),
      );
      continue;
    }
    if (!etapaUtilizable(etapas.get(h.toStageId))) {
      decisiones.push(
        decision<DatosHistorialEtapa>("negocio_etapa", h.id, "omitido", { motivo: "etapa_invalida" }),
      );
      continue;
    }
    if (h.fromStageId && !etapaUtilizable(etapas.get(h.fromStageId))) {
      decisiones.push(
        decision<DatosHistorialEtapa>("negocio_etapa", h.id, "omitido", { motivo: "etapa_origen_invalida" }),
      );
      continue;
    }
    const datos: DatosHistorialEtapa = {
      negocioIdOpai1: h.dealId,
      desdeEtapaIdOpai1: h.fromStageId ?? null,
      haciaEtapaIdOpai1: h.toStageId,
      cuando: h.changedAt,
    };
    const destinoId = ids.porExterno.get(h.id);
    if (destinoId)
      decisiones.push(
        decision<DatosHistorialEtapa>("negocio_etapa", h.id, "sin_cambios", { destinoId, datos }),
      );
    else decisiones.push(decision<DatosHistorialEtapa>("negocio_etapa", h.id, "crear", { datos }));
  }
  return decisiones;
}

function planContactosNegocio(
  filas: readonly NegocioContactoOpai1[],
  negocios: Map<string, Decision<DatosNegocio>>,
  resolverContacto: ResolverId,
  destino: EstadoDestino,
): Decision<DatosNegocioContacto>[] {
  const ids = indiceIds(destino, "negocio_contacto");
  const decisiones: Decision<DatosNegocioContacto>[] = [];

  for (const c of ordenPorId(filas)) {
    if (!negocioImportable(negocios.get(c.dealId))) {
      decisiones.push(
        decision<DatosNegocioContacto>("negocio_contacto", c.id, "omitido", {
          motivo: "negocio_no_importable",
        }),
      );
      continue;
    }
    const contactoId = resolverContacto(c.contactId);
    if (!contactoId) {
      decisiones.push(
        decision<DatosNegocioContacto>("negocio_contacto", c.id, "omitido", { motivo: "sin_contacto" }),
      );
      continue;
    }
    const rol = mapearRolNegocioContacto(c.role);
    const datos: DatosNegocioContacto = {
      negocioIdOpai1: c.dealId,
      contactoId,
      rol: rol.rol ?? "decisor",
      esPrincipal: rol.esPrincipal,
    };
    const destinoId = ids.porExterno.get(c.id);
    if (destinoId)
      decisiones.push(
        decision<DatosNegocioContacto>("negocio_contacto", c.id, "sin_cambios", { destinoId, datos }),
      );
    else decisiones.push(decision<DatosNegocioContacto>("negocio_contacto", c.id, "crear", { datos }));
  }
  return decisiones;
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
