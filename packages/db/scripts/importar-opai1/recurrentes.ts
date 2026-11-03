// Plan de plantillas de facturación recurrente (1.0 → finanzas.ventas_programaciones).
import { type Decision, decision, indiceIds, ordenEstable } from "./comun";
import { FINANZAS_PROGRAMACION_EN_MAIN } from "./comercial-pendiente";
import { modulosDelPlan, type OpcionesPlan } from "./opciones";
import type { DatosCuenta, ResolverCuentasFn } from "./cuentas";
import type { EstadoDestino } from "./destino-tipos";
import type { ContactoOpai1, ProgramacionRecurrenteOpai1 } from "./origen";
import { convertirProgramacion } from "./recurrentes-convertir";
import type {
  DatosProgramacion,
  PlanRecurrentes,
  ResumenDestinatarios,
} from "./recurrentes-tipos";

export type { DatosProgramacion, PlanRecurrentes, ResumenDestinatarios } from "./recurrentes-tipos";

const vacioDest = (): ResumenDestinatarios => ({
  entrantes: 0,
  asignados: 0,
  omitidos: 0,
  omitidosPorMotivo: {},
});

/** Destinatarios de proforma/cobranza: ids explícitos en la plantilla + contactos con `recibeFacturacion` en la cuenta. */
export function destinatariosRecurrenteOpai1(
  fila: ProgramacionRecurrenteOpai1,
  contactos: readonly ContactoOpai1[],
): string[] {
  const porBanderas = fila.crmAccountId
    ? contactos
        .filter((c) => c.accountId === fila.crmAccountId && c.recibeFacturacion)
        .map((c) => c.id)
    : [];
  return [...new Set([...fila.recipientContactIds, ...porBanderas])];
}

/** Cuenta por RUT del receptor: primero las del origen (puede ser nueva) y luego las ya existentes en 2.0. */
function cuentaPorRut(
  rutReceptor: string | null,
  decisionesCuenta: readonly Decision<DatosCuenta>[],
  destino: EstadoDestino,
): string | null {
  if (!rutReceptor) return null;
  const origen = decisionesCuenta.find(
    (d) =>
      d.fusionaCon === null &&
      d.datos?.rut === rutReceptor &&
      d.accion !== "conflicto" &&
      d.accion !== "omitido",
  );
  if (origen) return origen.destinoId ?? `nueva:${origen.idOpai1}`;
  return destino.cuentas.find((c) => c.rut === rutReceptor)?.id ?? null;
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
    return { decisiones: [], destinatarios: vacioDest(), avisos: [] };
  }
  const ids = indiceIds(destino, "programacion_recurrente");
  const decisiones: Decision<DatosProgramacion>[] = [];
  const avisos: { codigo: string; idOpai1: string }[] = [];
  const dest = vacioDest();
  const omitir = (id: string, motivo: string) =>
    decisiones.push(decision("programacion_recurrente", id, "omitido", { motivo }));

  for (const f of ordenEstable(filas)) {
    const conv = convertirProgramacion(f);
    if (!conv.ok) {
      omitir(f.id, conv.motivo);
      continue;
    }
    const base = conv.valor;
    const porId = resolverCuenta(f.crmAccountId);
    const cuentaClave = porId
      ? (porId.destinoId ?? porId.clave)
      : cuentaPorRut(base.receptor.rut, decisionesCuenta, destino);
    if (!cuentaClave && !base.receptor.rut) {
      omitir(f.id, "sin_cuenta_ni_rut");
      continue;
    }
    if (!cuentaClave) avisos.push({ codigo: "programacion_sin_cuenta_en_2_0", idOpai1: f.id });

    let instalacionClave: string | null = null;
    if (f.installationId) {
      instalacionClave = resolverInstalacion(f.installationId);
      if (!instalacionClave) {
        omitir(f.id, "instalacion_no_resuelta");
        continue;
      }
    }
    if (f.lines.some((l) => l.accountId)) {
      avisos.push({ codigo: "linea_con_cuenta_contable_sin_equivalente", idOpai1: f.id });
    }

    const contactosOpai1 = destinatariosRecurrenteOpai1(f, contactos);
    dest.entrantes += contactosOpai1.length + base.destinatariosCorreo.length;
    dest.asignados += base.destinatariosCorreo.length;
    for (const cid of contactosOpai1) {
      if (resolverContacto(cid)) dest.asignados += 1;
      else {
        dest.omitidos += 1;
        dest.omitidosPorMotivo.contacto_no_resuelto =
          (dest.omitidosPorMotivo.contacto_no_resuelto ?? 0) + 1;
      }
    }

    const datos: DatosProgramacion = {
      ...base,
      cuentaId: cuentaClave,
      instalacionId: instalacionClave,
      destinatariosContactoOpai1Ids: contactosOpai1,
    };
    const mapeado = ids.porExterno.get(f.id);
    decisiones.push(
      mapeado
        ? decision("programacion_recurrente", f.id, "sin_cambios", { destinoId: mapeado, datos })
        : decision("programacion_recurrente", f.id, "crear", { datos }),
    );
  }
  return { decisiones, destinatarios: dest, avisos };
}
