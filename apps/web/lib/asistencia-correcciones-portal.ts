const ZONA_DEFECTO = "America/Santiago";

export function itemsYZonaCorrecciones<T>(
  lista: { ok: boolean; data?: { items: T[] } },
  hoy: { ok: boolean; data?: { zona: string } },
): { items: T[]; zona: string } {
  return {
    items: lista.ok && lista.data ? lista.data.items : [],
    zona: hoy.ok && hoy.data ? hoy.data.zona : ZONA_DEFECTO,
  };
}