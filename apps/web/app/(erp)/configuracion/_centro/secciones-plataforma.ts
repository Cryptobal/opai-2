import { Blocks, FileText, Gauge, History, MessageSquare, Plug } from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import { type Seccion, seccion as s } from "./seccion-tipo";

/** Grupo «Plataforma» del centro de Configuración (ADR-018/038), separado de `secciones.ts`. */
export const SECCIONES_PLATAFORMA: readonly Seccion[] = [
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
