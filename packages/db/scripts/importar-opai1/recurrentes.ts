// Plan de plantillas de facturación recurrente (1.0 → finanzas.ventas_programaciones).
import {
  type Decision,
  decision,
  indiceIds,
  ordenEstable,
} from "./comun";
import { FINANZAS_PROGRAMACION_EN_MAIN } from "./comercial-pendiente";
import { modulosDelPlan, type OpcionesPlan } from "./opciones";
import type { DatosCuenta, ResolverCuentasFn } from "./cuentas";
import type { EstadoDestino } from "./destino-tipos";
import { cuentaListaParaFacturar } from "./tributario";
import type { ContactoOpai1, ProgramacionRecurrenteOpai1 } from "./origen";
import type {
  DatosProgramacion,
  PlanRecurrentes,
  ResumenDestinatarios,
} from "./recurrentes-tipos";

export type { DatosProgramacion, PlanRecurrentes, ResumenDestinatarios } from "./recurrentes-tipos";

function vacioDest(): ResumenDestinatarios {
  return { entrantes: 0, asignados: 0, omitidos: 0, omitidosPorMotivo: {} };
}

/** Destinatarios de proforma/cobranza: ids explícitos en la plantilla + contactos con `recibeFacturacion` en la cuenta. */
export function destinatariosRecurrenteOpai1(
  fila: ProgramacionRecurrenteOpai1,
  contactos: readonly ContactoOpai1[],
): string[] {
  const porBanderas = contactos
    .filter((c) => c.accountId === fila.accountId && c.recibeFacturacion)
    .map((c) => c.id);
  return [...new Set([...fila.recipientContactIds, ...porBanderas])];
}

function cuentaLista(decisionesCuenta: readonly Decision<DatosCuenta>[], accountId: string): boolean {
  const d = decisionesCuenta.find((x) => x.idOpai1 === accountId && x.fusionaCon === null && x.datos);
  if (!d?.datos) return false;
  return cuentaListaParaFacturar(d.datos);
}

export function planRecurrentes(
  filas: readonly ProgramacionRecurrenteOpai1[],
  contactos: readonly ContactoOpai1[],
  destino: EstadoDestino,
  opciones: OpcionesPlan,
  resolverCuenta: ResolverCuentasFn,
  resolverInstalacion: (id: string | null | undefined) => string | null,
  resolverContacto: (idOpai1: string) => string | null,
  decisionesCuenta: readonly Decision<DatosCuenta>[],
): PlanRecurrentes {
  const { finanzas } = modulosDelPlan(opciones);
  if (!finanzas || !FINANZAS_PROGRAMACION_EN_MAIN) {
    return { decisiones: [], destinatarios: vacioDest() };
  }
  const ids = indiceIds(destino, "programacion_recurrente");
  const decisiones: Decision<DatosProgramacion>[] = [];
  let entrantes = 0;
  let asignados = 0;
  let omitidos = 0;
  const omitidosPorMotivo: Record<string, number> = {};

  for (const f of ordenEstable(filas)) {
    const destinatariosIds = destinatariosRecurrenteOpai1(f, contactos);
    entrantes += destinatariosIds.length;
    if (!cuentaLista(decisionesCuenta, f.accountId)) {
      decisiones.push(
        decision("programacion_recurrente", f.id, "omitido", { motivo: "cuenta_tributario_incompleto" }),
      );
      continue;
    }
    const resCuenta = resolverCuenta(f.accountId);
    if (resCuenta === undefined || resCuenta === null) {
      decisiones.push(
        decision("programacion_recurrente", f.id, "omitido", {
          motivo: resCuenta === null ? "cuenta_conflicto" : "cuenta_no_en_origen",
        }),
      );
      continue;
    }
    const cuentaClave = resCuenta.destinoId ?? resCuenta.clave;

    let instalacionClave: string | null = null;
    if (f.installationId) {
      const inst = resolverInstalacion(f.installationId);
      if (!inst) {
        decisiones.push(
          decision("programacion_recurrente", f.id, "omitido", { motivo: "instalacion_no_resuelta" }),
        );
        continue;
      }
      instalacionClave = inst;
    }

    const lineas = f.lines.map((l) => ({
      glosa: (l.itemName?.trim() || l.description.trim()).slice(0, 500),
      monto: l.amount,
    }));
    if (lineas.length === 0) {
      decisiones.push(decision("programacion_recurrente", f.id, "omitido", { motivo: "sin_lineas" }));
      continue;
    }

    const destinatariosContactoOpai1Ids = destinatariosIds;
    for (const cid of destinatariosIds) {
      if (resolverContacto(cid)) asignados += 1;
      else {
        omitidos += 1;
        omitidosPorMotivo.contacto_no_resuelto = (omitidosPorMotivo.contacto_no_resuelto ?? 0) + 1;
      }
    }

    const datos: DatosProgramacion = {
      cuentaId: cuentaClave,
      instalacionId: instalacionClave,
      nombre: f.name?.trim() || `Programación ${f.id.slice(0, 8)}`,
      activa: f.active,
      tipoDte: f.dteType,
      diaGeneracion: f.dayOfMonth,
      moneda: f.currency,
      plazoPagoDias: f.plazoPagoDias,
      facturaTiming: f.facturaTiming,
      facturaDia: f.facturaDay ?? null,
      facturaMesRelativo: f.facturaMesRelativo,
      diasFacturacion: f.diasFacturacion ?? null,
      modoPeriodoFacturado: f.billingPeriodMode,
      politicaTextoPeriodo: f.periodPolicy,
      montoVariable: f.variableAmount,
      autoEnvioProforma: f.autoSendProforma,
      autoEnvioEstadoPago: f.autoSendPaymentStatement,
      notas: f.notes?.trim() ?? null,
      referenciasAdicionales: f.additionalReferences,
      proximaEjecucionEn: f.nextRunAt ?? null,
      ultimaEjecucionEn: f.lastRunAt ?? null,
      lineas,
      destinatariosContactoOpai1Ids,
    };

    const mapeado = ids.porExterno.get(f.id);
    if (mapeado) {
      decisiones.push(
        decision("programacion_recurrente", f.id, "sin_cambios", { destinoId: mapeado, datos }),
      );
      continue;
    }
    decisiones.push(decision("programacion_recurrente", f.id, "crear", { datos }));
  }

  return {
    decisiones,
    destinatarios: { entrantes, asignados, omitidos, omitidosPorMotivo },
  };
}
