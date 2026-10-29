import { ETIQUETA_ROL } from "@/app/_components/portales";

/** Rol de la lista (`core.roles.list` con los del sistema): personalizado o base (`sistema:<rol>`). */
export type RolVista = {
  id: string;
  nombre: string;
  descripcion: string | null;
  sistema: boolean;
  permisos: string[];
  archivado: boolean;
  usuarios: number;
};

/** Nombre visible: los del sistema con la misma etiqueta que el resto de la app («Solo lectura»). */
export const nombreRol = (r: Pick<RolVista, "id" | "nombre" | "sistema">) =>
  r.sistema ? (ETIQUETA_ROL[r.id.replace("sistema:", "")] ?? r.nombre) : r.nombre;
