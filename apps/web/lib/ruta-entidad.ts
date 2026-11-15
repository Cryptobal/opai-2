/**
 * Ficha de la entidad afectada por una fila de actividad (`entidad.tipo` de la auditoría), para que
 * cada fila lleve a lo que cambió (CAR-339). Un tipo sin ficha propia no lleva enlace.
 */
const BASE: Record<string, string> = {
  cuenta: "/cuentas",
  contacto: "/contactos",
  instalacion: "/instalaciones",
  persona: "/personas",
  cargo: "/cargos",
  negocio: "/negocios",
  cotizacion: "/cotizaciones",
  solicitud: "/solicitudes",
  ticket: "/tickets",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function rutaDeEntidad(
  entidad: { tipo: string; id: string } | null | undefined,
): string | undefined {
  const base = entidad ? BASE[entidad.tipo] : undefined;
  return base && entidad && UUID.test(entidad.id) ? `${base}/${entidad.id}` : undefined;
}
