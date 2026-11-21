import { puedeDeIdentidad } from "./permisos-ui";
import { identidadActual } from "./servidor";

/**
 * Pestaña «Negocios» de cuenta e instalación (ADR-041.5): solo si Comercial está activo para la
 * empresa y el usuario puede leer negocios. Sin pestañas deshabilitadas ni anuncios de módulos.
 */
/** Pestaña «Portal» en la ficha de cuenta (CAR-802): módulo portal_cliente activo y permiso de leer accesos. */
export async function verPestanaPortal(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("portal_cliente")) return false;
  return puedeDeIdentidad(identidad)("portal_cliente:accesos.read");
}

export async function verPestanaNegocios(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("comercial")) return false;
  return puedeDeIdentidad(identidad)("comercial:negocios.read");
}

/** ¿Puede crear, mover, ganar y perder negocios? Oculta esas acciones a quien solo lee (ADR-022). */
export async function puedeGestionarNegocios(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("comercial:negocios.manage") : false;
}

/** ¿Puede exportar los negocios a Excel? Oculta el botón a quien no tiene el permiso (ADR-022). */
export async function puedeExportarNegocios(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("comercial:negocios.exportar") : false;
}

/**
 * Pestaña «Rondas» de la ficha de instalación (Brief 14): solo si Rondas está activo para la empresa
 * y el usuario puede leer rondas. Sin pestañas deshabilitadas (ADR-041.5).
 */
/** Pestaña «Turnos extra» (tarifas) en la ficha de instalación (CAR-620). */
export async function verPestanaTurnosExtra(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("pauta")) return false;
  return puedeDeIdentidad(identidad)("pauta:read");
}

/**
 * Pestaña «Personas» (dotación) de la ficha de instalación (CAR-596): Pauta activa y lectura de pauta.
 * Sin Pauta, la pestaña no se muestra (ADR-041.5).
 */
export async function verPestanaPersonas(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("pauta")) return false;
  return puedeDeIdentidad(identidad)("pauta:read");
}

export async function verPestanaRondas(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("rondas")) return false;
  return puedeDeIdentidad(identidad)("rondas:read");
}

/**
 * Pestaña «Accesos» de la ficha de instalación (CAR-475, `control-acceso.md` §3): solo si Control de acceso
 * está activo para la empresa y el usuario puede leer accesos. Sin pestañas deshabilitadas (ADR-041.5).
 */
export async function verPestanaAccesos(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("acceso")) return false;
  return puedeDeIdentidad(identidad)("acceso:read");
}

/** ¿Puede ver y gestionar las listas de acceso? Oculta «Listas» a quien no puede (ADR-041.5). */
export async function puedeGestionarListas(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("acceso:listas.manage") : false;
}

/** ¿Puede registrar salidas, anular registros y cerrar en bloque (CAR-477)? Oculta esas acciones a quien no. */
export async function puedeGestionarRegistros(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("acceso:registros.manage") : false;
}

/** ¿Puede configurar el control de acceso (CAR-479)? Oculta «Configuración» de la pestaña a quien no. */
export async function puedeConfigurarAcceso(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("acceso:config.manage") : false;
}

/** Pestaña «Visitas» de la ficha de instalación (CAR-83): con Pauta activo y permiso de leerla. */
export async function verPestanaVisitas(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("pauta")) return false;
  return puedeDeIdentidad(identidad)("pauta:read");
}
/** ¿Puede prerregistrar visitas (CAR-478)? Oculta «Prerregistrar» a quien solo lee. */
export async function puedePrerregistrar(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("acceso:prerregistros.create") : false;
}
/** ¿Puede configurar puntos, plantillas y programación de rondas? Oculta acciones a quien solo lee. */
export async function puedeConfigurarRondas(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("rondas:configurar") : false;
}

/** ¿Puede registrar, derivar, descartar y convertir solicitudes (Leads)? Oculta esas acciones a quien solo lee. */
export async function puedeGestionarSolicitudes(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("comercial:solicitudes.manage") : false;
}
