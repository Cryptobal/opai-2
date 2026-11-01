import type { LucideIcon } from "lucide-react";

import type { GrupoId } from "./grupos";

export type Seccion = {
  id: string;
  href: string;
  titulo: string;
  /** Descripción del índice en iPad y desktop; la corta va en teléfono. */
  descripcion: string;
  corta: string;
  icono: LucideIcon;
  /** Grupo cerrado al que pertenece la entrada (REGLA §1.2). */
  grupo: GrupoId;
  /** Permiso para ver la sección (nunca `null`; sin permiso no aparece, REGLA §3.7). */
  permiso: string;
};

/** Sección con su ruta por defecto (`/configuracion/<id>`). */
export const seccion = (x: Omit<Seccion, "href"> & { href?: string }): Seccion => ({
  ...x,
  href: x.href ?? `/configuracion/${x.id}`,
});
