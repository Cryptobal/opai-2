/** Entradas del catálogo comercial (CAR-204): una por cobrable. Ver `catalogo-modulos.ts`. */
import {
  type EntradaCatalogo,
  esIncluidoEnBase,
  MODULO_FINANZAS,
  type ParteFinanzas,
} from "./catalogo-modulos";
import { PLAN_BASE, type FormaCobro, type UnidadCobro } from "./catalogo";

const modulo = (
  id: string,
  nombre: string,
  incluye: string,
  forma: FormaCobro,
  unidad: UnidadCobro | null,
): EntradaCatalogo => ({
  id,
  nombre,
  incluye,
  grupo: "modulo",
  incluidoEnBase: esIncluidoEnBase(id),
  formaSugerida: esIncluidoEnBase(id) ? null : forma,
  unidadSugerida: esIncluidoEnBase(id) ? null : unidad,
  dependencias: [],
});

const parte = (
  id: ParteFinanzas,
  nombre: string,
  incluye: string,
  dependencias: readonly (readonly string[])[] = [],
): EntradaCatalogo => ({
  id,
  nombre,
  incluye,
  grupo: "parte_finanzas",
  incluidoEnBase: false,
  formaSugerida: "fijo",
  unidadSugerida: null,
  dependencias,
});

export const ENTRADAS_CATALOGO: readonly EntradaCatalogo[] = [
  {
    id: PLAN_BASE,
    nombre: "Plan base",
    incluye:
      "Empresa, usuarios, roles y permisos, ajustes, auditoría, notificaciones, documentos, tickets y portal.",
    grupo: "base",
    incluidoEnBase: false,
    formaSugerida: "fijo",
    unidadSugerida: null,
    dependencias: [],
  },
  modulo("tickets", "Tickets", "Solicitudes y seguimiento de incidencias.", "fijo", null),
  modulo(
    "portal_trabajador",
    "Portal Trabajador",
    "Acceso del trabajador a sus datos y documentos.",
    "fijo",
    null,
  ),
  modulo(
    "portal_cliente",
    "Portal Cliente",
    "Acceso del cliente a su servicio y documentos.",
    "fijo",
    null,
  ),
  modulo(
    "agente",
    "Agente interno",
    "Asistente de la empresa con los permisos de quien lo usa.",
    "por_unidad",
    "usuario_activo",
  ),
  modulo(
    "asistencia",
    "Asistencia",
    "Marcas, turnos y control de jornada.",
    "por_unidad",
    "trabajador_activo",
  ),
  modulo(
    "nomina",
    "Remuneraciones (Nómina)",
    "Liquidaciones y motor de sueldos (el motor no se cobra aparte).",
    "por_unidad",
    "trabajador_activo",
  ),
  modulo(
    "pauta",
    "Operaciones",
    "Instalaciones, puestos y pauta de servicio.",
    "por_unidad",
    "instalacion_activa",
  ),
  modulo("rondas", "Rondas", "Recorridos y control de rondas.", "por_unidad", "instalacion_activa"),
  modulo(
    "rendiciones",
    "Rendiciones",
    "Rendición de gastos (los aprobadores no se cobran).",
    "por_unidad",
    "usuario_rinde",
  ),
  modulo(
    "comercial",
    "Comercial",
    "Negocios, embudo y seguimiento.",
    "por_unidad",
    "usuario_licencia",
  ),
  modulo("cpq", "CPQ", "Cotizaciones y propuestas.", "por_unidad", "usuario_licencia"),
  {
    id: MODULO_FINANZAS,
    nombre: "Finanzas",
    incluye: "Las siete partes juntas, a un precio mensual fijo.",
    grupo: "finanzas",
    incluidoEnBase: false,
    formaSugerida: "fijo",
    unidadSugerida: null,
    dependencias: [],
  },
  parte("finanzas.bancos", "Bancos", "Cuentas, cartolas y conciliación."),
  parte("finanzas.flujo", "Flujo de caja", "Planilla semanal y proyección.", [["finanzas.bancos"]]),
  parte("finanzas.ventas", "Ventas y facturación", "Facturas, notas y clientes."),
  parte("finanzas.cobranza", "Cobranza", "Seguimiento de cobros.", [["finanzas.ventas"]]),
  parte("finanzas.factoring", "Factoring", "Cesión de facturas.", [["finanzas.ventas"]]),
  parte("finanzas.compras", "Compras", "Facturas recibidas y proveedores."),
  parte("finanzas.contabilidad", "Contabilidad e informes", "Balance, resultados e informes.", [
    ["finanzas.ventas", "finanzas.compras"],
  ]),
];
