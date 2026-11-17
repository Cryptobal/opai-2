/** Entradas del catálogo comercial (CAR-204): una por cobrable. Ver `catalogo-modulos.ts`. */
import {
  COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT,
  type EntradaCatalogo,
} from "./catalogo-modulos";
import { PLAN_BASE } from "./catalogo";
import { ENTRADAS_FINANZAS } from "./catalogo-entradas-finanzas";
import { modulo } from "./catalogo-entradas-helpers";

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
  {
    id: COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT,
    nombre: "Cumplimiento DT",
    incluye: "LRE asistido, registro en Mi DT (contratos, anexos y finiquitos) y propuesta de finiquito.",
    grupo: "complemento_nomina",
    incluidoEnBase: false,
    formaSugerida: "por_unidad",
    unidadSugerida: "trabajador_activo",
    dependencias: [["nomina"]],
  },
  modulo(
    "pauta",
    "Operaciones",
    "Instalaciones, puestos y pauta de servicio.",
    "por_unidad",
    "instalacion_activa",
  ),
  modulo("rondas", "Rondas", "Recorridos y control de rondas.", "por_unidad", "instalacion_activa"),
  modulo(
    "central",
    "Central",
    "Central de monitoreo: alertas, escalamiento y bitácora (CAR-85).",
    "por_unidad",
    "instalacion_activa",
  ),
  modulo(
    "acceso",
    "Control de acceso",
    "Registro de visitas, vehículos y listas de acceso por instalación.",
    "por_unidad",
    "instalacion_activa",
  ),
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
  modulo(
    "desempeno",
    "Desempeño",
    "Scorecard por cargo y resultado por persona (ADR-094, se vende aparte).",
    "por_unidad",
    "usuario_licencia",
  ),
  ...ENTRADAS_FINANZAS,
];