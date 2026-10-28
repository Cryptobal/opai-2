import {
  Blocks,
  Building2,
  CalendarClock,
  FileText,
  Gauge,
  History,
  KeyRound,
  type LucideIcon,
  MessageSquare,
  Palette,
  Plug,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

export type Seccion = {
  id: string;
  href: string;
  titulo: string;
  /** Descripción del índice en iPad y desktop; la corta va en teléfono. */
  descripcion: string;
  corta: string;
  icono: LucideIcon;
  grupo: "Empresa" | "Operaciones" | "Acceso" | "Plataforma" | "Módulos activos";
  /** Permiso para ver la sección (sin permiso no aparece en el índice). */
  permiso: string | null;
};

const s = (x: Omit<Seccion, "href"> & { href?: string }): Seccion => ({
  ...x,
  href: x.href ?? `/configuracion/${x.id}`,
});

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
  s({
    id: "modulos",
    titulo: "Módulos",
    descripcion: "Contratados, en trial y disponibles",
    corta: "Contratados y disponibles",
    icono: Blocks,
    grupo: "Plataforma",
    permiso: PERMISOS_CORE.tenantRead,
  }),
  s({
    id: "integraciones",
    titulo: "Integraciones",
    descripcion: "Correo, IA, WhatsApp, banco y más",
    corta: "Correo, IA y más",
    icono: Plug,
    grupo: "Plataforma",
    permiso: PERMISOS_CORE.integracionesManage,
  }),
  s({
    id: "comunicaciones",
    titulo: "Comunicaciones",
    descripcion: "Qué se avisa, por qué canal y a quién",
    corta: "Avisos, canales y destinatarios",
    icono: MessageSquare,
    grupo: "Plataforma",
    permiso: PERMISOS_CORE.comunicacionesManage,
  }),
  s({
    id: "documentos",
    titulo: "Documentos",
    descripcion: "Tipos de documento, vencimientos y alertas",
    corta: "Tipos y vencimientos",
    icono: FileText,
    grupo: "Plataforma",
    permiso: PERMISOS_CORE.documentosManage,
  }),
  s({
    id: "consumos",
    titulo: "Consumos",
    descripcion: "IA, correos, mapas y llamadas del mes",
    corta: "IA, correos y llamadas",
    icono: Gauge,
    grupo: "Plataforma",
    permiso: PERMISOS_CORE.consumosRead,
  }),
  s({
    id: "auditoria",
    titulo: "Auditoría",
    descripcion: "Registro de cada escritura, humana o de agente",
    corta: "Cada escritura, humana o de agente",
    icono: History,
    grupo: "Plataforma",
    permiso: PERMISOS_CORE.auditRead,
  }),
];
