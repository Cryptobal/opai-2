// Capacidades del módulo Finanzas · Compras (Brief 23 · PR 1) y Ventas DTE (CAR-137 · PR 1).
import type { Capacidad } from "../types";
import { centrosListar } from "./centros";
import { comprasAsignarCentro } from "./compras-centro";
import { comprasRegistrar } from "./compras-escritura";
import { comprasImportar } from "./compras-importar";
import { comprasListar } from "./compras-lectura";
import { dteConfigActualizar, dteConfigObtener } from "./dte-config";
import { foliosCargarCaf, foliosListar } from "./folios";
import { planActualizar, planCrear } from "./plan-cuentas";
import { planInicializar } from "./plan-escritura";
import { planListar } from "./plan-lectura";
import { proveedoresActualizar, proveedoresCrear } from "./proveedores-escritura";
import { proveedoresListar, proveedoresObtener } from "./proveedores-lectura";
import { ventasProyeccionFlujo } from "./proyeccion-flujo-cap";
import {
  ventasCrearBorrador,
  ventasEmitir,
  ventasEmitirNotaCredito,
  ventasEnviarSii,
} from "./ventas-escritura";
import { ventasLibroResumen, ventasListar, ventasObtener } from "./ventas-lectura";
import { ventasPdf } from "./ventas-pdf";

export { ajustesFinanzas } from "./ajustes";
export { calcularEstadoCobro, registrarCobroDocumento, sincronizarCobroDocumento, validarDocumentoCobroBanco } from "./cobros";

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
  ventasListar,
  ventasObtener,
  ventasLibroResumen,
  ventasCrearBorrador,
  ventasEmitir,
  ventasEnviarSii,
  ventasEmitirNotaCredito,
  ventasProyeccionFlujo,
  ventasPdf,
  foliosListar,
  foliosCargarCaf,
  dteConfigObtener,
  dteConfigActualizar,
];
