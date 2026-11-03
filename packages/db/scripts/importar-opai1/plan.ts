// Plan completo de la importación desde 1.0: puro y determinista (mismo origen + mismo estado 2.0 →
// mismo plan). No escribe: la carga real (otro PR, con el OK de Carlos) consumirá este plan.
import { pendientesImportacion, type Pendiente } from "./comercial-pendiente";
import { type CorrelativoCpqPropuesto, planCorrelativosCpq } from "./correlativos-cpq";
import { type Aviso, type Decision, ordenEstable, type Propuesta } from "./comun";
import type { DatosContacto } from "./contactos-datos";
import { planContactos } from "./contactos";
import { type DatosCuenta, planCuentas, resolverCuentas } from "./cuentas";
import type { EstadoDestino } from "./destino-tipos";
import { type DatosInstalacion, planInstalaciones } from "./instalaciones";
import { nombreCanonico, textoLimpio } from "./normalizar";
import { modulosDelPlan, OPCIONES_POR_DEFECTO, type OpcionesPlan } from "./opciones";
import type { DatosOpai1 } from "./origen";
import type { DatosProgramacion, ResumenDestinatarios } from "./recurrentes";
import { planRecurrentes } from "./recurrentes";
import { avisosTributariosCuentas, resumenTributario, type ResumenTributario } from "./tributario-plan";

/** Valor de rubro/segmento/tamaño de 1.0 que pasaría a etiqueta (Carlos los confirma). */
export type EtiquetaPropuesta = {
  grupo: "Rubro" | "Segmento" | "Tamaño";
  valor: string;
  filas: number;
};

export type Plan = {
  opciones: OpcionesPlan;
  cuentas: Decision<DatosCuenta>[];
  contactos: Decision<DatosContacto>[];
  instalaciones: Decision<DatosInstalacion>[];
  programaciones: Decision<DatosProgramacion>[];
  destinatarios: ResumenDestinatarios;
  correlativosCpq: CorrelativoCpqPropuesto[];
  propuestas: Propuesta[];
  avisos: Aviso[];
  etiquetas: EtiquetaPropuesta[];
  pendientes: Pendiente[];
  tributario: ResumenTributario;
};

function resolverDesdeDecisiones<D>(decisiones: readonly Decision<D>[]) {
  const porId = new Map(decisiones.map((d) => [d.idOpai1, d]));
  return (idOpai1: string): string | null => {
    let d = porId.get(idOpai1);
    if (!d) return null;
    if (d.fusionaCon && d.accion !== "conflicto") d = porId.get(d.fusionaCon) ?? d;
    if (d.accion === "conflicto" || (d.accion === "omitido" && !d.fusionaCon)) return null;
    return d.destinoId ?? `nueva:${d.idOpai1}`;
  };
}

export function calcularPlan(
  origen: DatosOpai1,
  destino: EstadoDestino,
  opciones: OpcionesPlan = OPCIONES_POR_DEFECTO,
): Plan {
  const cuentas = planCuentas(origen.accounts, destino);
  const resolver = resolverCuentas(cuentas.decisiones);
  const contactos = planContactos(origen.contacts, resolver, destino);
  const instalaciones = planInstalaciones(origen.installations, resolver, destino);
  const resolverInst = resolverDesdeDecisiones(instalaciones.decisiones);
  const resolverContacto = resolverDesdeDecisiones(contactos.decisiones);
  const recurrentes = planRecurrentes(
    origen.recurringInvoiceSchedules,
    origen.contacts,
    destino,
    opciones,
    resolver,
    (id) => (id ? resolverInst(id) : null),
    resolverContacto,
    cuentas.decisiones,
  );
  const ultimoCpq = new Map(destino.correlativosCpq.map((c) => [c.anio, c.ultimo]));
  const correlativosCpq = planCorrelativosCpq(
    origen.cpqQuotes,
    ultimoCpq,
    modulosDelPlan(opciones).cpq,
  );
  const avisosTrib = avisosTributariosCuentas(cuentas.decisiones);
  return {
    opciones,
    cuentas: cuentas.decisiones,
    contactos: contactos.decisiones,
    instalaciones: instalaciones.decisiones,
    programaciones: recurrentes.decisiones,
    destinatarios: recurrentes.destinatarios,
    correlativosCpq,
    propuestas: [...cuentas.propuestas, ...contactos.propuestas],
    avisos: [
      ...cuentas.avisos,
      ...contactos.avisos,
      ...instalaciones.avisos,
      ...avisosTrib,
    ],
    etiquetas: etiquetasPropuestas(origen),
    pendientes: pendientesImportacion(origen, opciones),
    tributario: resumenTributario(cuentas.decisiones),
  };
}

const GRUPOS = [
  ["Rubro", "industry"],
  ["Segmento", "segment"],
  ["Tamaño", "size"],
] as const;

/** Valores distintos por grupo (agrupados por forma canónica; gana la primera escritura vista). */
export function etiquetasPropuestas(origen: DatosOpai1): EtiquetaPropuesta[] {
  const salida: EtiquetaPropuesta[] = [];
  for (const [grupo, campo] of GRUPOS) {
    const valores = new Map<string, EtiquetaPropuesta>();
    for (const cuenta of ordenEstable(origen.accounts)) {
      const valor = textoLimpio(cuenta[campo]);
      if (!valor) continue;
      const clave = nombreCanonico(valor);
      const actual = valores.get(clave);
      if (actual) actual.filas += 1;
      else valores.set(clave, { grupo, valor, filas: 1 });
    }
    salida.push(...[...valores.values()].sort((a, b) => a.valor.localeCompare(b.valor)));
  }
  return salida;
}
