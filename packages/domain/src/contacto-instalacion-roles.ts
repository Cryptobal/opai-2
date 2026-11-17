/** Roles de contacto en una instalación (ADR-040 §5, `core.contacto_instalaciones`). */
export const ROLES_CONTACTO_INSTALACION = [
  "jefe_sitio",
  "recibe_reportes",
  "autoriza_visitas",
  "emergencia",
] as const;

export type RolContactoInstalacion = (typeof ROLES_CONTACTO_INSTALACION)[number];

/** Textos visibles en ficha y listas (diccionario vertical Instalación). */
export const ETIQUETA_ROL_CONTACTO_INSTALACION: Record<RolContactoInstalacion, string> = {
  jefe_sitio: "Contacto en sitio / jefe de seguridad",
  recibe_reportes: "Recibe reportes",
  autoriza_visitas: "Autoriza visitas",
  emergencia: "Emergencia",
};