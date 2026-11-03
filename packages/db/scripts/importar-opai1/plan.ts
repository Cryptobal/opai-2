// Plan completo de la importación desde 1.0: puro y determinista (mismo origen + mismo estado 2.0 →
// mismo plan). No escribe: la carga real (otro PR, con el OK de Carlos) consumirá este plan.
import { COMERCIAL_EN_MAIN, pendientesImportacion, type Pendiente } from "./comercial-pendiente";
import { type Aviso, type Decision, ordenEstable, type Propuesta } from "./comun";
import type { DatosContacto } from "./contactos-datos";
import { planContactos } from "./contactos";
import { type DatosCuenta, planCuentas, resolverCuentas } from "./cuentas";
import type { EstadoDestino } from "./destino-tipos";
import { type DatosInstalacion, planInstalaciones } from "./instalaciones";
import { modulosDelPlan, OPCIONES_POR_DEFECTO, type OpcionesPlan } from "./opciones";
import { nombreCanonico, textoLimpio } from "./normalizar";
import { type DatosNegocio, planNegocios } from "./negocios-plan";
import type { DatosOpai1 } from "./origen";
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
  negocios: Decision<DatosNegocio>[];
  propuestas: Propuesta[];
  avisos: Aviso[];
  etiquetas: EtiquetaPropuesta[];
  pendientes: Pendiente[];
  tributario: ResumenTributario;
  etapasSinMapear: string[];
  negociosIncompletos: string[];
  importacionId: string | null;
};

export function calcularPlan(
  origen: DatosOpai1,
  destino: EstadoDestino,
  opciones: OpcionesPlan = OPCIONES_POR_DEFECTO,
): Plan {
  const { comercial } = modulosDelPlan(opciones);
  const cuentas = planCuentas(origen.accounts, destino);
  const resolver = resolverCuentas(cuentas.decisiones);
  const contactos = planContactos(origen.contacts, resolver, destino);
  const instalaciones = planInstalaciones(origen.installations, resolver, destino);
  const neg =
    comercial && COMERCIAL_EN_MAIN
      ? planNegocios(origen, resolver, destino, opciones.tenantSlug ?? "gard")
      : { decisiones: [], avisos: [], etapasSinMapear: [], negociosIncompletos: [] };
  const avisosTrib = avisosTributariosCuentas(cuentas.decisiones);
  return {
    opciones,
    cuentas: cuentas.decisiones,
    contactos: contactos.decisiones,
    instalaciones: instalaciones.decisiones,
    negocios: neg.decisiones,
    propuestas: [...cuentas.propuestas, ...contactos.propuestas],
    avisos: [
      ...cuentas.avisos,
      ...contactos.avisos,
      ...instalaciones.avisos,
      ...neg.avisos,
      ...avisosTrib,
    ],
    etiquetas: etiquetasPropuestas(origen),
    pendientes: pendientesImportacion(origen, opciones),
    tributario: resumenTributario(cuentas.decisiones),
    etapasSinMapear: neg.etapasSinMapear,
    negociosIncompletos: neg.negociosIncompletos,
    importacionId: null,
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
