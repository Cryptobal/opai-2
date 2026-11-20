/** Marca como leídas solo las filas indicadas (filtro activo en Novedades). */
export function listaMarcarIds<T extends { id: string; leida: boolean; destacada?: boolean }>(
  datos: {
    items: T[];
    noLeidas: number;
    destacadaPendiente: T | null;
  },
  ids: readonly string[],
): typeof datos {
  const marcar = new Set(ids);
  if (!marcar.size) return datos;
  let baja = 0;
  const items = datos.items.map((item) => {
    if (!marcar.has(item.id) || item.leida) return item;
    baja += 1;
    return { ...item, leida: true };
  });
  const destacadaPendiente =
    datos.destacadaPendiente && marcar.has(datos.destacadaPendiente.id)
      ? null
      : datos.destacadaPendiente;
  return {
    items,
    noLeidas: Math.max(0, datos.noLeidas - baja),
    destacadaPendiente,
  };
}

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
