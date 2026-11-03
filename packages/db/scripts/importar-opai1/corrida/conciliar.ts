// Conciliación de lectura: conteos 1.0 vs importado (sin datos personales).
import type { Plan } from "../plan";
import type { DatosOpai1 } from "../origen";
import type { Accion } from "../comun";

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

const contarAccion = (acciones: readonly { accion: Accion }[], a: Accion) =>
  acciones.filter((d) => d.accion === a).length;

export function conciliar(origen: DatosOpai1, plan: Plan): ResumenConciliacion {
  const bloques: [string, number, readonly { accion: Accion }[]][] = [
    ["cuenta", origen.accounts.length, plan.cuentas],
    ["contacto", origen.contacts.length, plan.contactos],
    ["instalacion", origen.installations.length, plan.instalaciones],
    ["negocio", origen.deals.length, plan.negocios ?? []],
  ];
  const entidades = bloques.map(([entidad, enOrigen, decisiones]) => {
    const importados = contarAccion(decisiones, "crear") + contarAccion(decisiones, "actualizar");
    const omitidos =
      contarAccion(decisiones, "omitido") + contarAccion(decisiones, "conflicto");
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
