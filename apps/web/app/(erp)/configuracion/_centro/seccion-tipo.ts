import type { LucideIcon } from "lucide-react";

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

/** Sección con su ruta por defecto (`/configuracion/<id>`). */
export const seccion = (x: Omit<Seccion, "href"> & { href?: string }): Seccion => ({
  ...x,
  href: x.href ?? `/configuracion/${x.id}`,
});
