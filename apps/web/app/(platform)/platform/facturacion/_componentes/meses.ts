// Meses del cobro (CAR-188): nombres y lista de los últimos meses.

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** «octubre de 2026» desde «2026-10». */
export function nombreMes(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  return `${MESES[m - 1] ?? ""} de ${a}`;
}

/** Los últimos `n` meses (aaaa-mm), del actual hacia atrás. */
export function mesesRecientes(actual: string, n = 12): string[] {
  const [a, m] = actual.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}
