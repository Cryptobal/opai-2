import { SlidersHorizontal } from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import type { Seccion } from "./seccion-tipo";

/** Entrada del índice para un módulo activo con ajustes propios (`/configuracion/modulo/<id>`). */
export const seccionModulo = (id: string, nombre: string): Seccion => ({
  id: `modulo-${id}`,
  href: `/configuracion/modulo/${id}`,
  titulo: nombre,
  descripcion: "Ajustes del módulo",
  corta: "Ajustes del módulo",
  icono: SlidersHorizontal,
  grupo: "Módulos activos",
  permiso: PERMISOS_CORE.configRead,
});
