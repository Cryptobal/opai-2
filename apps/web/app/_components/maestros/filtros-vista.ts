// Lo que abre una hoja o una ficha no es parte de una vista: solo los filtros de la lista.
const FUERA = new Set([
  "cursor",
  "nueva",
  "nuevo",
  "contacto",
  "editar",
  "invitar",
  "subir",
]);

/** Filtros vigentes de la URL, sin hojas ni paginación (`?estado=cliente_activo&q=andina`). */
export function filtrosDeUrl(search: string): string {
  const p = new URLSearchParams(search);
  for (const k of [...p.keys()]) if (FUERA.has(k)) p.delete(k);
  const s = p.toString();
  return s ? `?${s}` : "";
}
