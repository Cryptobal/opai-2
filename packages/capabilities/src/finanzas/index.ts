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
import { ventasCesionCeder } from "./ventas-cesion-ceder";
import { ventasCesionSimular } from "./ventas-cesion-simular";
import { ventasCesionListar } from "./cesiones-listar";
import { trabajosCesion } from "./trabajos-cesion";
import { trabajosDte } from "./trabajos-dte";
import {
  ventasCrearBorrador,
  ventasEmitir,
  ventasEmitirNotaCredito,
  ventasEnviarSii,
} from "./ventas-escritura";
import { reporteResultados } from "./reportes-resultados";
import { ventasBuscar } from "./ventas-buscar";
import { ventasLibroResumen, ventasListar, ventasObtener } from "./ventas-lectura";
import { ventasEnviarCliente } from "./ventas-enviar-cliente";
import { ventasEnvios } from "./ventas-envios";
import { ventasPdf } from "./ventas-pdf";
import { ventasPreflightEmision } from "./ventas-preflight";
import { ventasProyeccionFlujo } from "./proyeccion-flujo-cap";
import {
  ventasProgramacionesListar,
  ventasProgramacionesObtener,
} from "./ventas-programacion-lectura";
import {
  ventasProgramacionActualizar,
  ventasProgramacionCambiarEstado,
  ventasProgramacionCrear,
} from "./ventas-programacion-escritura";
import { cobranzaPausar, cobranzaRecordar, cobranzaRegistrarGestion } from "./cobranza-escritura";
import { cobranzaDeudor, cobranzaResumen } from "./cobranza-resumen";
import { trabajoRecordatoriosCobranza } from "./cobranza-trabajo";
import { hoyEnFinanzas } from "./hoy-resumen";
import { ventasProgramacionGenerar } from "./ventas-programacion-generar";
import { ventasProgramacionVistaPrevia } from "./ventas-programacion-vista-previa";
import { trabajoGenerarProgramaciones } from "./ventas-programacion-trabajo";

export { ajustesFinanzas } from "./ajustes";
export { calcularEstadoCobro, registrarCobroDocumento, sincronizarCobroDocumento, validarDocumentoCobroBanco, validarDocumentoCompraBanco, documentoEmitidoConciliable } from "./cobros";

export const trabajosFinanzas = [...trabajosDte, ...trabajosCesion, trabajoGenerarProgramaciones, trabajoRecordatoriosCobranza];

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
  ventasBuscar,
  reporteResultados,
  cobranzaResumen,
  cobranzaDeudor,
  cobranzaRecordar,
  cobranzaPausar,
  cobranzaRegistrarGestion,
  hoyEnFinanzas,
  ventasProgramacionesListar,
  ventasProgramacionesObtener,
  ventasProgramacionCrear,
  ventasProgramacionActualizar,
  ventasProgramacionCambiarEstado,
  ventasProgramacionGenerar,
  ventasProgramacionVistaPrevia,
  ventasCrearBorrador,
  ventasEmitir,
  ventasPreflightEmision,
  ventasEnviarSii,
  ventasEmitirNotaCredito,
  ventasProyeccionFlujo,
  ventasCesionSimular,
  ventasCesionCeder,
  ventasCesionListar,
  ventasPdf,
  ventasEnviarCliente,
  ventasEnvios,
  foliosListar,
  foliosCargarCaf,
  dteConfigObtener,
  dteConfigActualizar,
];
