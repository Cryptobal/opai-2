import type { ValorCampo } from "./tipos";

const DIAS = (n: number | null) =>
  n === 7 ? "Lunes a domingo" : n === 5 ? "Lunes a viernes" : n != null ? `${n} días` : "";

export type FilaPuestoCotizacion = {
  nombre: string;
  posiciones: number;
  patron: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  diasCobertura: number | null;
  ventaMensualClp: number | null;
  seccion: string;
};

export function textoTurnoPuesto(p: Pick<FilaPuestoCotizacion, "patron" | "horaInicio" | "horaFin" | "diasCobertura">): string {
  return [p.patron, p.horaInicio && p.horaFin ? `${p.horaInicio}–${p.horaFin}` : null, DIAS(p.diasCobertura)]
    .filter(Boolean)
    .join(" · ");
}

export function valoresPuesto(p: FilaPuestoCotizacion): Readonly<Record<string, ValorCampo>> {
  return {
    "puesto.nombre": p.nombre,
    "puesto.turno_horario": textoTurnoPuesto(p) || null,
    "puesto.cantidad": p.posiciones,
    "puesto.precio_mensual": p.ventaMensualClp,
  };
}