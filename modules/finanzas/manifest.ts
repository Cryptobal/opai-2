import { ajustesFinanzas, capacidadesFinanzas, defineModule } from "@opai/capabilities";

import { capacidades as capacidadesFlujo } from "./capacidades";
import {
  PERMISO_CERRAR,
  PERMISO_CONFIGURAR,
  PERMISO_GESTIONAR,
  PERMISO_VER,
} from "./capacidades/permisos";
import {
  PERMISO_BANCOS_AUTORIZAR,
  PERMISO_BANCOS_GESTIONAR,
  PERMISO_BANCOS_VER,
} from "./capacidades/bancos/permisos";

/**
 * Manifest del módulo Finanzas (ADR-003). El núcleo deriva navegación, permisos, configuración,
 * eventos y herramientas MCP desde aquí. Un solo módulo con dos conjuntos de capacidades:
 * - Compras (Brief 23, CAR-98): plan de cuentas, centros de costo, proveedores y libro de compras, en
 *   packages/capabilities/src/finanzas. Conciliación, reglas, asientos y estados llegan después.
 * - Flujo de caja (Brief 20, CAR-91, ADR-026): planilla por semana con capa Plan editable, cierre
 *   semanal contra el banco y ajustes, en modules/finanzas/capacidades. Las capas Real y Comprometido
 *   se derivarán de hechos (DTE, banco, nómina) cuando esos módulos existan.
 * Finanzas es bloqueo financiero (ADR-016): solo owner y admin; gerente, supervisor y viewer no la ven.
 */
export const manifest = defineModule({
  id: "finanzas",
  nombre: "Finanzas",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "finanzas:read", descripcion: "Ver el libro de compras, los proveedores, el plan de cuentas, los centros de costo y el libro de ventas" },
    { id: "finanzas:compras.manage", descripcion: "Registrar, importar y asignar centro de costo a documentos recibidos" },
    { id: "finanzas:proveedores.manage", descripcion: "Crear y editar proveedores y sus valores por defecto" },
    { id: "finanzas:plan.manage", descripcion: "Cargar y editar el plan de cuentas" },
    { id: "finanzas:ventas.manage", descripcion: "Emitir facturas electrónicas, notas de crédito y operar el libro de ventas" },
    {
      id: "finanzas:ventas.configure",
      descripcion: "Configurar facturación electrónica: cargar CAF y parámetros DTE del tenant",
    },
    { id: PERMISO_VER, descripcion: "Ver la planilla del flujo de caja" },
    { id: PERMISO_GESTIONAR, descripcion: "Fijar, mover y dar por cumplidas las celdas del flujo" },
    { id: PERMISO_CERRAR, descripcion: "Sellar y reabrir semanas del flujo" },
    { id: PERMISO_CONFIGURAR, descripcion: "Configurar filas, saldo inicial y umbral del flujo" },
    { id: PERMISO_BANCOS_VER, descripcion: "Ver cuentas bancarias, movimientos y sugerencias de conciliación" },
    { id: PERMISO_BANCOS_GESTIONAR, descripcion: "Importar cartolas, conciliar movimientos y administrar reglas" },
    { id: PERMISO_BANCOS_AUTORIZAR, descripcion: "Autorizar movimientos de remuneraciones y pagos sensibles" },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/ventas",
      etiqueta: "Ventas",
      icono: "FileText",
      orden: 3,
      permiso: "finanzas:read",
    },
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/compras",
      etiqueta: "Compras",
      icono: "FileText",
      orden: 4,
      permiso: "finanzas:read",
    },
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/bancos",
      etiqueta: "Bancos",
      icono: "Landmark",
      orden: 5,
      permiso: PERMISO_BANCOS_VER,
    },
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/plan-de-cuentas",
      etiqueta: "Plan de cuentas",
      icono: "Briefcase",
      orden: 6,
      permiso: "finanzas:read",
    },
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/flujo",
      etiqueta: "Flujo de caja",
      icono: "ChartLine",
      orden: 10,
      permiso: PERMISO_VER,
    },
  ],
  configuracion: ajustesFinanzas,
  eventos: [
    { id: "finanzas.plan.inicializado", descripcion: "Se cargó la plantilla chilena base del plan de cuentas." },
    { id: "finanzas.plan.cuenta_creada", descripcion: "Se creó una cuenta en el plan de cuentas." },
    { id: "finanzas.plan.cuenta_actualizada", descripcion: "Cambió una cuenta del plan de cuentas." },
    { id: "finanzas.proveedor.creado", descripcion: "Se creó un proveedor." },
    { id: "finanzas.proveedor.actualizado", descripcion: "Cambiaron los datos de un proveedor." },
    { id: "finanzas.compra.registrada", descripcion: "Se registró un documento recibido en el libro de compras." },
    { id: "finanzas.compras.importadas", descripcion: "Se importó un lote de documentos recibidos." },
    { id: "finanzas.compras.centro_asignado", descripcion: "Se asignó un centro de costo a documentos del libro de compras." },
    { id: "finanzas.flujo.fila_creada", descripcion: "Se creó una fila del flujo de caja." },
    { id: "finanzas.flujo.fila_actualizada", descripcion: "Se cambió una fila del flujo de caja." },
    { id: "finanzas.flujo.fila_archivada", descripcion: "Se archivó o restauró una fila del flujo de caja." },
    { id: "finanzas.flujo.celda_fijada", descripcion: "Se fijó la cifra de una celda del flujo." },
    { id: "finanzas.flujo.celdas_movidas", descripcion: "Se reprogramaron celdas de una fila del flujo." },
    { id: "finanzas.flujo.celda_cumplida", descripcion: "Se dio por cumplida una celda del flujo." },
    { id: "finanzas.flujo.semana_sellada", descripcion: "Se selló una semana del flujo." },
    { id: "finanzas.flujo.semana_reabierta", descripcion: "Se reabrió una semana sellada del flujo." },
    { id: "finanzas.flujo.ajustes_cambiados", descripcion: "Cambiaron los ajustes del flujo." },
    { id: "finanzas.flujo.saldo_negativo_avisado", descripcion: "Una semana futura quedó bajo el umbral del aviso in-app." },
    { id: "finanzas.flujo.importado", descripcion: "Se importó un lote de celdas al flujo." },
    { id: "finanzas.banco.cuenta_creada", descripcion: "Se creó una cuenta bancaria." },
    { id: "finanzas.banco.cuenta_actualizada", descripcion: "Se actualizó una cuenta bancaria." },
    { id: "finanzas.banco.cartola_importada", descripcion: "Se importó una cartola bancaria." },
    { id: "finanzas.banco.conciliacion_confirmada", descripcion: "Se confirmó una conciliación bancaria." },
    { id: "finanzas.banco.conciliacion_deshecha", descripcion: "Se deshizo una conciliación bancaria." },
    { id: "finanzas.banco.cobro_manual", descripcion: "Se registró un cobro manual sin movimiento bancario." },
    { id: "finanzas.banco.saldo_bajo_avisado", descripcion: "El saldo de cartola quedó bajo el umbral (campana in-app)." },
    { id: "finanzas.venta.borrador_creado", descripcion: "Se creó un borrador de factura o nota en el libro de ventas." },
    { id: "finanzas.venta.emitida", descripcion: "Se emitió un DTE con folio y firma." },
    { id: "finanzas.venta.enviada_sii", descripcion: "Se envió un DTE al SII." },
    { id: "finanzas.venta.nota_credito_emitida", descripcion: "Se emitió una nota de crédito con referencia." },
    { id: "finanzas.venta.cedida", descripcion: "Se registró una cesión de factoring sobre una factura." },
    { id: "finanzas.dte_config.actualizada", descripcion: "Cambió la configuración DTE (ambiente o conectores)." },
    { id: "finanzas.folios.caf_cargado", descripcion: "Se cargó un rango de folios autorizados (CAF)." },
  ],
  capacidades: [...capacidadesFinanzas, ...capacidadesFlujo],
});
