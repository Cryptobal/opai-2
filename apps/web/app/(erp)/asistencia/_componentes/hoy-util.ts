export const ESTADOS_HOY: Record<string, { etiqueta: string; tono: "success" | "warning" | "danger" | "info" | "neutro" }> = {
  presente: { etiqueta: "Presente", tono: "success" },
  sin_marca: { etiqueta: "Sin marca", tono: "warning" },
  ausente: { etiqueta: "Ausente", tono: "danger" },
  incompleto: { etiqueta: "Sin salida", tono: "info" },
  sin_turno: { etiqueta: "Sin turno", tono: "neutro" },
};

export function duracionHoy(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}