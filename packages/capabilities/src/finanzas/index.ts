// Capacidades del módulo Finanzas · Compras (Brief 23 · PR 1). Se exponen igual en UI, API /api/v1 y
// MCP (ADR-004, ADR-055). El manifest de modules/finanzas las lista; el registro las da de alta al arrancar.
import type { Capacidad } from "../types";
import { centrosListar } from "./centros";
import { comprasAsignarCentro } from "./compras-centro";
import { comprasRegistrar } from "./compras-escritura";
import { comprasImportar } from "./compras-importar";
import { comprasListar } from "./compras-lectura";
import { planActualizar, planCrear } from "./plan-cuentas";
import { planInicializar } from "./plan-escritura";
import { planListar } from "./plan-lectura";
import { proveedoresActualizar, proveedoresCrear } from "./proveedores-escritura";
import { proveedoresListar, proveedoresObtener } from "./proveedores-lectura";

export { ajustesFinanzas } from "./ajustes";

export const capacidadesFinanzas: readonly Capacidad[] = [
  planListar,
  planInicializar,
  planCrear,
  planActualizar,
  centrosListar,
  proveedoresListar,
  proveedoresObtener,
  proveedoresCrear,
  proveedoresActualizar,
  comprasListar,
  comprasRegistrar,
  comprasImportar,
  comprasAsignarCentro,
];
