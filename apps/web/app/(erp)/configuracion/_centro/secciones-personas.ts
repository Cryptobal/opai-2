import { ListChecks } from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import { seccion as s, type Seccion } from "./seccion-tipo";

/** CAR-355: pasos de ingreso y salida de una persona y vigencia de «No recontratar» (ajustes del núcleo). */
export const SECCIONES_PERSONAS: readonly Seccion[] = [
  s({
    id: "personas",
    titulo: "Personas",
    descripcion: "Pasos de ingreso y salida, y marca «No recontratar»",
    corta: "Pasos de ingreso y salida",
    icono: ListChecks,
    grupo: "personas-acceso",
    permiso: PERMISOS_CORE.vinculosRead,
  }),
];
