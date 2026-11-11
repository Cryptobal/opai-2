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

/** Marca una sola novedad como leída al tiro; si ya lo estaba, devuelve los mismos datos. */
export function listaConUnaLeida<T extends { id: string; leida: boolean }>(datos: {
  items: T[];
  noLeidas: number;
  destacadaPendiente: T | null;
}): (id: string) => typeof datos {
  return (id) => {
    const item = datos.items.find((i) => i.id === id);
    if (!item || item.leida) return datos;
    const destacadaPendiente = datos.destacadaPendiente?.id === id ? null : datos.destacadaPendiente;
    return {
      items: datos.items.map((i) => (i.id === id ? { ...i, leida: true } : i)),
      noLeidas: Math.max(0, datos.noLeidas - 1),
      destacadaPendiente,
    };
  };
}
