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
