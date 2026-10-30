import {
  Building2,
  CalendarClock,
  CalendarDays,
  KeyRound,
  Palette,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import { type Seccion, seccion as s } from "./seccion-tipo";
import { SECCIONES_PLATAFORMA } from "./secciones-plataforma";

export type { Seccion };

/** Ámbitos fijos del centro de Configuración (ADR-018/038), en el orden del diseño (19/20). */
export const SECCIONES: readonly Seccion[] = [
  s({
    id: "empresa",
    titulo: "Datos de la empresa",
    descripcion: "Razón social, RUT, dirección y contactos",
    corta: "Razón social, RUT y contactos",
    icono: Building2,
    grupo: "Empresa",
    permiso: PERMISOS_CORE.tenantRead,
  }),
  s({
    id: "marca",
    titulo: "Marca",
    descripcion: "Logos y colores para documentos y correos",
    corta: "Logos y colores de documentos",
    icono: Palette,
    grupo: "Empresa",
    permiso: PERMISOS_CORE.tenantRead,
  }),
  s({
    id: "cumplimiento",
    titulo: "Datos personales",
    descripcion: "Ley 21.719: DPA, DPO, solicitudes, incidentes y retención",
    corta: "DPA, solicitudes e incidentes",
    icono: ShieldCheck,
    grupo: "Empresa",
    permiso: PERMISOS_CORE.cumplimientoRead,
  }),
  s({
    id: "preferencias",
    titulo: "Preferencias",
    descripcion: "Las mías: tema, idioma y notificaciones",
    corta: "Las mías: tema y notificaciones",
    icono: UserRound,
    grupo: "Empresa",
    permiso: null,
  }),
  s({
    id: "operaciones",
    titulo: "Patrones y funciones",
    descripcion: "Patrones de turno y funciones de los puestos",
    corta: "Patrones de turno y funciones",
    icono: CalendarClock,
    grupo: "Operaciones",
    permiso: PERMISOS_CORE.patronesRead,
  }),
  s({
    id: "calendario",
    titulo: "Calendario",
    descripcion: "Feriados nacionales y días propios de la empresa",
    corta: "Feriados y días de la empresa",
    icono: CalendarDays,
    grupo: "Operaciones",
    permiso: PERMISOS_CORE.calendarioRead,
  }),
  s({
    id: "usuarios",
    titulo: "Usuarios y permisos",
    descripcion: "Quién entra, con qué rol y a qué portales",
    corta: "Roles y portales",
    icono: Users,
    grupo: "Acceso",
    permiso: PERMISOS_CORE.usersRead,
  }),
  s({
    id: "agentes",
    titulo: "Agentes y API keys",
    descripcion: "Keys, presupuesto y autonomía de cada agente",
    corta: "Presupuesto y autonomía",
    icono: KeyRound,
    grupo: "Acceso",
    permiso: PERMISOS_CORE.apikeysManage,
  }),
  s({
    id: "aprobaciones",
    titulo: "Aprobaciones pendientes",
    descripcion: "Acciones de agentes que esperan tu visto bueno",
    corta: "Acciones de agentes por revisar",
    icono: UserCheck,
    grupo: "Acceso",
    permiso: PERMISOS_CORE.aprobacionesManage,
  }),
  ...SECCIONES_PLATAFORMA,
];
