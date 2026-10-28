import { esAreaNav, type DatoPersonalDeclarado } from "@opai/domain";
import type { z } from "zod";

import { registrarCapacidades } from "./registry";
import type { Capacidad } from "./types";

const ID_MODULO = /^[a-z][a-z0-9_]*$/;

export type Permiso = { id: string; descripcion: string };

/**
 * Entrada de navegación. El icono se nombra (Lucide) para que el manifest sea serializable. `area`
 * es obligatoria para el portal `erp` (lista cerrada de `NAVEGACION.md` §7, Brief 05); los demás
 * portales no agrupan por área todavía. `permiso`: sin él, la entrada no exige permiso propio (el
 * módulo activo y el permiso del portal ya filtran).
 */
export type EntradaNavegacion = {
  portal: string;
  href: string;
  etiqueta: string;
  icono: string;
  orden?: number;
  area?: string;
  permiso?: string | null;
};

/** Acción de ⌘K (Brief 05, §7 de `NAVEGACION.md`): solo navega, nunca ejecuta una escritura directa. */
export type AccionNavegacion = {
  capacidad: string;
  etiqueta: string;
  href: string;
  icono: string;
  permiso?: string | null;
};

export type EventoDeDominio = { id: string; descripcion: string };

/**
 * Manifest de un módulo vendible (ADR-003). El núcleo deriva navegación, permisos,
 * configuración, notificaciones y herramientas MCP desde aquí; el módulo no implementa nada de eso.
 */
export type ModuleManifest = {
  id: string;
  nombre: string;
  version: string;
  /** Ids de módulos de los que depende. Solo puede referenciar tablas de estos y del núcleo. */
  dependencias: readonly string[];
  permisos: readonly Permiso[];
  navegacion: readonly EntradaNavegacion[];
  /** Acciones para ⌘K (Brief 05): "Nueva cotización", "Agregar persona". Solo navegan. */
  acciones?: readonly AccionNavegacion[];
  /** Esquema de ajustes del módulo. El núcleo renderiza la configuración por ámbito (ADR-008). */
  configuracion: z.ZodType;
  /** Eventos que emite. El núcleo enruta notificaciones a partir de ellos (ADR-008). */
  eventos: readonly EventoDeDominio[];
  capacidades: readonly Capacidad[];
  /** Inventario de datos personales (RAT, Ley 21.719). `defineDatosPersonales(id, [...])`. */
  datosPersonales?: readonly DatoPersonalDeclarado[];
};

/** Declara un módulo validando que ids, permisos y capacidades le pertenezcan. */
export function defineModule(manifest: ModuleManifest): ModuleManifest {
  const { id } = manifest;
  if (!ID_MODULO.test(id)) {
    throw new Error(`Id de módulo inválido "${id}": minúsculas, dígitos y guion bajo.`);
  }
  for (const permiso of manifest.permisos) {
    if (!permiso.id.startsWith(`${id}:`)) {
      throw new Error(`El permiso "${permiso.id}" del módulo "${id}" debe empezar con "${id}:".`);
    }
  }
  for (const capacidad of manifest.capacidades) {
    if (capacidad.modulo !== id) {
      throw new Error(`La capacidad "${capacidad.id}" no pertenece al módulo "${id}".`);
    }
    if (capacidad.permiso !== null && !manifest.permisos.some((p) => p.id === capacidad.permiso)) {
      throw new Error(
        `La capacidad "${capacidad.id}" usa un permiso no declarado: "${capacidad.permiso}".`,
      );
    }
  }
  for (const evento of manifest.eventos) {
    if (!evento.id.startsWith(`${id}.`)) {
      throw new Error(`El evento "${evento.id}" del módulo "${id}" debe empezar con "${id}.".`);
    }
  }
  const permisoValido = (permiso: string | null | undefined) =>
    permiso == null || manifest.permisos.some((p) => p.id === permiso);
  for (const entrada of manifest.navegacion) {
    if (entrada.portal === "erp" && !esAreaNav(entrada.area ?? "")) {
      throw new Error(
        `La entrada "${entrada.href}" del módulo "${id}" necesita un "area" de la lista cerrada (NAVEGACION.md §7).`,
      );
    }
    if (!permisoValido(entrada.permiso)) {
      throw new Error(
        `La entrada "${entrada.href}" del módulo "${id}" usa un permiso no declarado: "${entrada.permiso}".`,
      );
    }
  }
  for (const accion of manifest.acciones ?? []) {
    if (!permisoValido(accion.permiso)) {
      throw new Error(
        `La acción "${accion.etiqueta}" del módulo "${id}" usa un permiso no declarado: "${accion.permiso}".`,
      );
    }
    const capacidad = manifest.capacidades.find((c) => c.id === accion.capacidad);
    if (!capacidad || accion.permiso !== capacidad.permiso)
      throw new Error(
        `La acción "${accion.etiqueta}" debe declarar su capacidad y el mismo permiso.`,
      );
  }
  for (const dato of manifest.datosPersonales ?? []) {
    if (dato.modulo !== id) {
      throw new Error(
        `El inventario de datos personales "${dato.tabla}" no pertenece al módulo "${id}".`,
      );
    }
  }
  return manifest;
}

const manifests = new Map<string, ModuleManifest>();

/** Manifests registrados (navegación, `core.modules.list`, dependencias en plataforma). */
export function listarModulos(): readonly ModuleManifest[] {
  return [...manifests.values()];
}

export function obtenerModulo(id: string): ModuleManifest | undefined {
  return manifests.get(id);
}

/** Solo para tests y para reconstruir el registro. */
export function limpiarModulos(): void {
  manifests.clear();
}

/** Registra módulos verificando dependencias y registrando sus capacidades. */
export function registrarModulos(modulos: readonly ModuleManifest[]): void {
  const ids = new Set(modulos.map((m) => m.id));
  for (const modulo of modulos) {
    for (const dep of modulo.dependencias) {
      if (!ids.has(dep)) {
        throw new Error(`El módulo "${modulo.id}" depende de "${dep}", que no está registrado.`);
      }
    }
    registrarCapacidades(modulo.capacidades);
    manifests.set(modulo.id, modulo);
  }
}
