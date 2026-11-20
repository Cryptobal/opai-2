export { mesAnterior, mesSiguiente } from "@opai/domain";

/** «Octubre 2026» (es-CL, mes con mayúscula inicial). */
export function nombreDeMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const nombre = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, 1)),
  );
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${a}`;
}
