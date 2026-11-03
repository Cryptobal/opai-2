import {
  COMERCIAL_EN_MAIN,
  FINANZAS_PROGRAMACION_EN_MAIN,
  MOTIVO_EXPORT_CPQ_INCOMPLETO,
  MOTIVO_MODULO_COMERCIAL_INACTIVO,
  MOTIVO_MODULO_CPQ_INACTIVO,
  MOTIVO_MODULO_FINANZAS_INACTIVO,
  MOTIVO_PENDIENTE_CRM,
  MOTIVO_PENDIENTE_MODELO_PROGRAMACION,
} from "./comercial-motivos";
import { modulosDelPlan, type OpcionesPlan } from "./opciones";
import type { DatosOpai1 } from "./origen";

export type Pendiente = { entidad: string; filas: number; motivo: string };

/** Filas que el plan no importa aún, según módulos del tenant y modelos disponibles en 2.0. */
export function pendientesImportacion(datos: DatosOpai1, opciones: OpcionesPlan): Pendiente[] {
  const { comercial, finanzas, cpq } = modulosDelPlan(opciones);
  const salida: Pendiente[] = [];

  const conteosCrm: [string, number][] = [
    ["etapa", datos.pipelineStages.length],
    ["negocio", datos.deals.length],
    ["negocio_etapa", datos.dealStageHistory.length],
    ["negocio_contacto", datos.dealContacts.length],
  ];
  for (const [entidad, filas] of conteosCrm) {
    if (filas === 0) continue;
    if (!comercial) salida.push({ entidad, filas, motivo: MOTIVO_MODULO_COMERCIAL_INACTIVO });
    else if (!COMERCIAL_EN_MAIN) salida.push({ entidad, filas, motivo: MOTIVO_PENDIENTE_CRM });
  }

  const cotizaciones = datos.cpqQuotes.length;
  if (cotizaciones > 0) {
    if (!cpq)
      salida.push({
        entidad: "cotizacion",
        filas: cotizaciones,
        motivo: MOTIVO_MODULO_CPQ_INACTIVO,
      });
    else
      salida.push({
        entidad: "cotizacion",
        filas: cotizaciones,
        motivo: MOTIVO_EXPORT_CPQ_INCOMPLETO,
      });
  }

  const recurrentes = datos.recurringInvoiceSchedules.length;
  if (recurrentes > 0) {
    if (!finanzas)
      salida.push({
        entidad: "programacion_factura_recurrente",
        filas: recurrentes,
        motivo: MOTIVO_MODULO_FINANZAS_INACTIVO,
      });
    else if (!FINANZAS_PROGRAMACION_EN_MAIN)
      salida.push({
        entidad: "programacion_factura_recurrente",
        filas: recurrentes,
        motivo: MOTIVO_PENDIENTE_MODELO_PROGRAMACION,
      });
  }

  return salida;
}

/** @deprecated Usar `pendientesImportacion`. Mantenido para tests del mapeo CRM. */
export function pendientesComerciales(datos: DatosOpai1): Pendiente[] {
  return pendientesImportacion(datos, { modulosActivos: ["comercial"] });
}
