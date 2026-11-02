/** Fecha de cálculo (decisión §16-6): juego legal y UF del día, no la validez del contrato. */
export function fechaCalculoHoy(zona = "America/Santiago"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
