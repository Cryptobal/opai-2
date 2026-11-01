import { INSTRUMENTOS_DEFECTO, PLANTILLA_SEGURIDAD } from "./plantilla";
import type { LineaItem, ModeloCosteo, ParametrosCalculo, Puesto, VersionCalculo } from "./tipos";

/** Ficticios: ningún sueldo, precio ni nombre de cotizaciones reales. */
export const parametrosPrueba: ParametrosCalculo = { fecha: "2026-11-01",
  uf: { valorClpEscalado: 408_450_000, fecha: "2026-11-01" }, minimoPct: 100_000, alertaPct: 30_000 };
export function modeloPrueba(): ModeloCosteo { return structuredClone(PLANTILLA_SEGURIDAD); }
export function versionPrueba(lineas: VersionCalculo["lineas"] = []): VersionCalculo {
  return { numero: 1, modeloId: "seguridad", modeloVersion: 1, meses: 12,
    margenModo: "margen_sobre_venta", margenPct: 0, variables: {}, lineas };
}
export function itemPrueba(costoUnitario = 1_000, cambios: Partial<LineaItem> = {}): LineaItem {
  return { id: "item", seccion: "comun", habilitada: true, variables: {}, tipo: "item",
    item: { id: "equipo", categoria: "equipamiento", costoUnitario, moneda: "CLP",
      modo: "mensual_fijo", rateo: { tipo: "contrato" } }, cantidadEscalada: 10_000, margenPct: 0, ...cambios };
}
export function puestoPrueba(cambios: Partial<Puesto> = {}): Puesto {
  return { id: "puesto", seccion: "instalacion_ficticia", habilitada: true, variables: {}, tipo: "puesto",
    posiciones: 1, patron: "4x4", horaInicio: "08:00", horaFin: "20:00", diasCobertura: 7,
    ...cambios };
}
export function financieraPrueba() { return structuredClone(INSTRUMENTOS_DEFECTO); }

export const proveedorPrueba = (costoMensualClp = 1_000_000) => ({
  obtener: () => ({ costoMensualClp, origen: "fixture ficticio" }),
});
