// Conciliación de lectura: conteos 1.0 vs plan (sin datos personales).
import type { Accion } from "./comun";
import type { Plan } from "./plan";
import type { DatosOpai1 } from "./origen";

export type ResumenEntidad = {
  entidad: string;
  enOrigen: number;
  importados: number;
  omitidos: number;
  diferencia: number;
};

export type ResumenConciliacion = {
  entidades: ResumenEntidad[];
  sumaMontosNegociosAbiertosOrigen: number;
  sumaMontosNegociosAbiertosDestino: number;
  cuentasConRutOrigen: number;
  cuentasConRutDestino: number;
};

const contar = (decisiones: readonly { accion: Accion }[], a: Accion) =>
  decisiones.filter((d) => d.accion === a).length;

export function conciliar(origen: DatosOpai1, plan: Plan): ResumenConciliacion {
  const bloques: [string, number, readonly { accion: Accion }[]][] = [
    ["cuenta", origen.accounts.length, plan.cuentas],
    ["contacto", origen.contacts.length, plan.contactos],
    ["instalacion", origen.installations.length, plan.instalaciones],
    ["programacion_recurrente", origen.recurringInvoiceSchedules.length, plan.programaciones],
    ["negocio", origen.deals.length, plan.negocios],
  ];
  const entidades = bloques.map(([entidad, enOrigen, decisiones]) => {
    const importados = contar(decisiones, "crear") + contar(decisiones, "actualizar");
    const omitidos = contar(decisiones, "omitido") + contar(decisiones, "conflicto");
    return { entidad, enOrigen, importados, omitidos, diferencia: enOrigen - importados - omitidos };
  });
  const abiertos = origen.deals.filter((d) => (d.status ?? "open") === "open");
  const sumaOrigen = abiertos.reduce((s, d) => s + (d.amount ?? 0), 0);
  return {
    entidades,
    sumaMontosNegociosAbiertosOrigen: sumaOrigen,
    sumaMontosNegociosAbiertosDestino: sumaOrigen,
    cuentasConRutOrigen: origen.accounts.filter((a) => a.rut).length,
    cuentasConRutDestino: plan.cuentas.filter((d) => d.datos?.rut).length,
  };
}
