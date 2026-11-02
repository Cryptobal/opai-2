import { CalendarClock, CalendarDays, FileText, Wallet } from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import { seccion as s, type Seccion } from "./seccion-tipo";

export const SECCIONES_OPERACION: readonly Seccion[] = [
  s({
    id: "operaciones",
    titulo: "Patrones y funciones",
    descripcion: "Patrones de turno y funciones de cada puesto",
    corta: "Patrones de turno y funciones",
    icono: CalendarClock,
    grupo: "operacion",
    permiso: PERMISOS_CORE.patronesRead,
  }),
  s({
    id: "remuneraciones",
    titulo: "Remuneraciones",
    descripcion: "Indicadores legales, confirmación y mutual adicional",
    corta: "Valores legales del costo",
    icono: Wallet,
    grupo: "operacion",
    permiso: PERMISOS_CORE.remuneracionesRead,
  }),
  s({
    id: "calendario",
    titulo: "Calendario",
    descripcion: "Feriados que se aplican a la pauta y a los recargos",
    corta: "Feriados y días de la empresa",
    icono: CalendarDays,
    grupo: "operacion",
    permiso: PERMISOS_CORE.calendarioRead,
  }),
  s({
    id: "documentos",
    titulo: "Documentos",
    descripcion: "Plantillas de contratos y anexos",
    corta: "Tipos y vencimientos",
    icono: FileText,
    grupo: "operacion",
    permiso: PERMISOS_CORE.documentosManage,
  }),
];
