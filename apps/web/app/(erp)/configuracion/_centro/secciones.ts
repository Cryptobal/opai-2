import {
  Blocks,
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  Gauge,
  History,
  KeyRound,
  MessageSquare,
  Palette,
  Plug,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import { type Seccion, seccion as s } from "./seccion-tipo";

export type { Seccion };

/**
 * Entradas fijas del centro de Configuración (ADR-018/038), agrupadas en los 6 grupos cerrados de
 * `grupos.ts` (REGLA §1.2) y en el orden del diseño. Preferencias ya no está aquí: es una página
 * personal del menú de usuario (REGLA §3b). Los módulos con ajustes se agregan en `datos.ts` con
 * `seccionModulo` (grupo `modulos`); ningún módulo suma una entrada suelta (REGLA §2.5).
 */
export const SECCIONES: readonly Seccion[] = [
  // Empresa
  s({
    id: "empresa",
    titulo: "Datos de la empresa",
    descripcion: "Razón social, RUT, dirección y contactos",
    corta: "Razón social, RUT y contactos",
    icono: Building2,
    grupo: "empresa",
    permiso: PERMISOS_CORE.tenantRead,
  }),
  s({
    id: "marca",
    titulo: "Marca",
    descripcion: "Logos y colores para documentos y correos",
    corta: "Logos y colores de documentos",
    icono: Palette,
    grupo: "empresa",
    permiso: PERMISOS_CORE.tenantRead,
  }),
  s({
    id: "cumplimiento",
    titulo: "Datos personales",
    descripcion: "Ley 21.719: DPA, DPO, solicitudes, incidentes y retención",
    corta: "DPA, solicitudes e incidentes",
    icono: ShieldCheck,
    grupo: "empresa",
    permiso: PERMISOS_CORE.cumplimientoRead,
  }),
  s({
    id: "comunicaciones",
    titulo: "Comunicaciones",
    descripcion: "Qué se avisa, por qué canal y a quién",
    corta: "Avisos, canales y destinatarios",
    icono: MessageSquare,
    grupo: "empresa",
    permiso: PERMISOS_CORE.comunicacionesManage,
  }),
  // Operación
  s({
    id: "operaciones",
    titulo: "Patrones y funciones",
    descripcion: "Patrones de turno y funciones de los puestos",
    corta: "Patrones de turno y funciones",
    icono: CalendarClock,
    grupo: "operacion",
    permiso: PERMISOS_CORE.patronesRead,
  }),
  s({
    id: "calendario",
    titulo: "Calendario",
    descripcion: "Feriados nacionales y días propios de la empresa",
    corta: "Feriados y días de la empresa",
    icono: CalendarDays,
    grupo: "operacion",
    permiso: PERMISOS_CORE.calendarioRead,
  }),
  s({
    id: "documentos",
    titulo: "Documentos",
    descripcion: "Tipos de documento, vencimientos y alertas",
    corta: "Tipos y vencimientos",
    icono: FileText,
    grupo: "operacion",
    permiso: PERMISOS_CORE.documentosManage,
  }),
  // Personas y acceso
  s({
    id: "usuarios",
    titulo: "Usuarios y permisos",
    descripcion: "Quién entra, con qué rol y a qué portales",
    corta: "Roles y portales",
    icono: Users,
    grupo: "personas-acceso",
    permiso: PERMISOS_CORE.usersRead,
  }),
  // Agentes
  s({
    id: "agentes",
    titulo: "Agentes y API keys",
    descripcion: "Keys, presupuesto y autonomía de cada agente",
    corta: "Presupuesto y autonomía",
    icono: KeyRound,
    grupo: "agentes",
    permiso: PERMISOS_CORE.apikeysManage,
  }),
  s({
    id: "aprobaciones",
    titulo: "Aprobaciones pendientes",
    descripcion: "Acciones de agentes que esperan tu visto bueno",
    corta: "Acciones de agentes por revisar",
    icono: UserCheck,
    grupo: "agentes",
    permiso: PERMISOS_CORE.aprobacionesManage,
  }),
  // Módulos (el Catálogo; cada módulo con ajustes se agrega en datos.ts)
  s({
    id: "modulos",
    titulo: "Catálogo de módulos",
    descripcion: "Contratados, en trial y disponibles",
    corta: "Contratados y disponibles",
    icono: Blocks,
    grupo: "modulos",
    permiso: PERMISOS_CORE.tenantRead,
  }),
  // Uso y registros
  s({
    id: "integraciones",
    titulo: "Integraciones",
    descripcion: "Correo, IA, WhatsApp, banco y más",
    corta: "Correo, IA y más",
    icono: Plug,
    grupo: "uso-registros",
    permiso: PERMISOS_CORE.integracionesManage,
  }),
  s({
    id: "consumos",
    titulo: "Consumos",
    descripcion: "IA, correos, mapas y llamadas del mes",
    corta: "IA, correos y llamadas",
    icono: Gauge,
    grupo: "uso-registros",
    permiso: PERMISOS_CORE.consumosRead,
  }),
  s({
    id: "auditoria",
    titulo: "Auditoría",
    descripcion: "Registro de cada escritura, humana o de agente",
    corta: "Cada escritura, humana o de agente",
    icono: History,
    grupo: "uso-registros",
    permiso: PERMISOS_CORE.auditRead,
  }),
];
