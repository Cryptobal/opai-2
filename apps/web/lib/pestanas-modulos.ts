import { puedeDeIdentidad } from "./permisos-ui";
import { identidadActual } from "./servidor";

/**
 * Pestaña «Negocios» de cuenta e instalación (ADR-041.5): solo si Comercial está activo para la
 * empresa y el usuario puede leer negocios. Sin pestañas deshabilitadas ni anuncios de módulos.
 */
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
export async function verPestanaRondas(): Promise<boolean> {
  const identidad = await identidadActual();
  if (!identidad?.modulosActivos.includes("rondas")) return false;
  return puedeDeIdentidad(identidad)("rondas:read");
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
