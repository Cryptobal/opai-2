/** Quita la marca de «nueva» al tiro, antes de que vuelva la lista del servidor. */
export function listaComoLeida<T extends { leida: boolean }>(datos: {
  items: T[];
  noLeidas: number;
  destacadaPendiente: T | null;
}): { items: T[]; noLeidas: number; destacadaPendiente: null } {
  return {
    items: datos.items.map((item) => ({ ...item, leida: true })),
    noLeidas: 0,
    destacadaPendiente: null,
  };
}
