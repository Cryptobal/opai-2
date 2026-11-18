import { periodoAnterior, periodoSiguiente } from "./nomina/periodo";

const partes = (mes: string): [number, number] => {
  const [anio, m] = mes.split("-").map(Number);
  return [anio ?? 0, m ?? 0];
};

const aIsoMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, "0")}`;

/** Mes anterior de «AAAA-MM». */
export function mesAnterior(mes: string): string {
  const [anio, m] = partes(mes);
  const s = periodoAnterior(anio, m);
  return aIsoMes(s.anio, s.mes);
}

/** Mes siguiente de «AAAA-MM». */
export function mesSiguiente(mes: string): string {
  const [anio, m] = partes(mes);
  const s = periodoSiguiente(anio, m);
  return aIsoMes(s.anio, s.mes);
}