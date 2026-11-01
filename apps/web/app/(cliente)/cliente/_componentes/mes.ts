/** Mes anterior de «AAAA-MM». */
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** Mes siguiente de «AAAA-MM». */
export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

/** «Octubre 2026» (es-CL, mes con mayúscula inicial). */
export function nombreDeMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const nombre = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, 1)),
  );
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${a}`;
}
