import { type ModuleManifest } from "@opai/capabilities";
import { SlidersHorizontal } from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import { areaMenuDeModulo, moduloConAjustesVisibles } from "./modulo-area";
import type { Seccion } from "./seccion-tipo";

/** Entrada del índice para un módulo contratado (`/configuracion/modulo/<id>`). */
export const seccionModulo = (
  manifest: ModuleManifest,
  conAjustesManifest: Set<string>,
): Seccion => {
  const linea = moduloConAjustesVisibles(manifest.id, conAjustesManifest)
    ? "Ajustes del módulo"
    : "Sin ajustes";
  return {
    id: `modulo-${manifest.id}`,
    href: `/configuracion/modulo/${manifest.id}`,
    titulo: manifest.nombre,
    descripcion: linea,
    corta: linea,
    icono: SlidersHorizontal,
    grupo: "modulos",
    permiso: PERMISOS_CORE.configRead,
    modulo: manifest.id,
    areaMenu: areaMenuDeModulo(manifest),
  };
};
