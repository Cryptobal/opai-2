import { type Decision, decision, indiceIds, ordenEstable } from "./comun";
import { mapearRolNegocioContacto } from "./comercial-pendiente";
import {
  type DatosEtapa,
  type DatosHistorialEtapa,
  type DatosNegocio,
  type DatosNegocioContacto,
  etapaUtilizable,
  negocioImportable,
  ordenPorId,
  type ResolverId,
} from "./comercial-plan-tipos";
import type { EstadoDestino } from "./destino-tipos";
import type { HistorialEtapaOpai1, NegocioContactoOpai1 } from "./origen";

export function planHistorial(
  filas: readonly HistorialEtapaOpai1[],
  negocios: Map<string, Decision<DatosNegocio>>,
  etapas: Map<string, Decision<DatosEtapa>>,
  destino: EstadoDestino,
): Decision<DatosHistorialEtapa>[] {
  const ids = indiceIds(destino, "negocio_etapa");
  const decisiones: Decision<DatosHistorialEtapa>[] = [];

  for (const h of ordenEstable(filas.map((x) => ({ ...x, createdAt: x.changedAt })))) {
    if (!negocioImportable(negocios.get(h.dealId))) {
      decisiones.push(
        decision<DatosHistorialEtapa>("negocio_etapa", h.id, "omitido", {
          motivo: "negocio_no_importable",
        }),
      );
      continue;
    }
    if (!etapaUtilizable(etapas.get(h.toStageId))) {
      decisiones.push(
        decision<DatosHistorialEtapa>("negocio_etapa", h.id, "omitido", {
          motivo: "etapa_invalida",
        }),
      );
      continue;
    }
    if (h.fromStageId && !etapaUtilizable(etapas.get(h.fromStageId))) {
      decisiones.push(
        decision<DatosHistorialEtapa>("negocio_etapa", h.id, "omitido", {
          motivo: "etapa_origen_invalida",
        }),
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

export function planContactosNegocio(
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
        decision<DatosNegocioContacto>("negocio_contacto", c.id, "omitido", {
          motivo: "sin_contacto",
        }),
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
        decision<DatosNegocioContacto>("negocio_contacto", c.id, "sin_cambios", {
          destinoId,
          datos,
        }),
      );
    else
      decisiones.push(decision<DatosNegocioContacto>("negocio_contacto", c.id, "crear", { datos }));
  }
  return decisiones;
}
