import { PERMISOS_CORE as P, type ROLES, tienePermiso } from "@opai/domain";

export const ACCIONES: { etiqueta: string; permiso: string }[] = [
  { etiqueta: "Cuentas · ver", permiso: P.cuentasRead },
  { etiqueta: "Cuentas · editar", permiso: P.cuentasManage },
  { etiqueta: "Instalaciones · editar", permiso: P.instalacionesManage },
  { etiqueta: "Personas · ver", permiso: P.personasRead },
  { etiqueta: "Personas · editar", permiso: P.personasManage },
  { etiqueta: "Personas · sueldos", permiso: P.estructurasReadSensible },
  { etiqueta: "Documentos · subir", permiso: P.documentosManage },
  { etiqueta: "Usuarios · gestionar", permiso: P.usersManage },
  { etiqueta: "Agentes · aprobar", permiso: P.aprobacionesManage },
  { etiqueta: "Configuración · editar", permiso: P.configManage },
];

/** Etiquetas de las acciones que el rol puede hacer (la lista apilada de la matriz en teléfono). */
export function permisosPorRol(rol: (typeof ROLES)[number]): string[] {
  return ACCIONES.filter((a) => tienePermiso(rol, a.permiso)).map((a) => a.etiqueta);
}
