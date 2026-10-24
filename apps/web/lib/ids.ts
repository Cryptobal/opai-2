import { notFound } from "next/navigation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿Tiene forma de UUID (v4 o v7)? Los ids de entidades del núcleo siempre la tienen. */
export const esUuid = (id: string): boolean => UUID.test(id);

/**
 * Id de una ruta `[id]`: lo que no es un UUID (p. ej. `/personas/nueva` abierto a mano) no puede
 * existir, así que responde 404 en vez de "No pudimos cargar esta información".
 */
export function requerirUuid(id: string): string {
  if (!esUuid(id)) notFound();
  return id;
}
