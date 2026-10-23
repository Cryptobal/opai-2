import type { Puesto } from "@/lib/tipos-maestros";

export type DatosPuesto = {
  nombre: string;
  cargoId: string | null;
  patron: string;
  trabajo: string;
  descanso: string;
  inicio: string;
  fin: string;
  jornada: string;
  dotacion: string;
  desde: string;
};

export const PATRONES = [
  ["4x4", "4×4 · 4 días trabajo, 4 descanso"],
  ["5x2", "5×2 · 5 días trabajo, 2 descanso"],
  ["6x1", "6×1 · 6 días trabajo, 1 descanso"],
  ["7x7", "7×7 · 7 días trabajo, 7 descanso"],
  ["2x2", "2×2 · 2 días trabajo, 2 descanso"],
  ["otro", "Personalizado"],
].map(([valor, etiqueta]) => ({ valor: valor ?? "", etiqueta: etiqueta ?? "" }));

export const inicialPuesto = (p?: Puesto | null): DatosPuesto => {
  const patron = p ? `${p.diasTrabajo}x${p.diasDescanso}` : "4x4";
  return {
    nombre: p?.nombre ?? "",
    cargoId: p?.cargoId ?? null,
    patron: PATRONES.some((x) => x.valor === patron) ? patron : "otro",
    trabajo: String(p?.diasTrabajo ?? 4),
    descanso: String(p?.diasDescanso ?? 4),
    inicio: p?.horaInicio ?? "08:00",
    fin: p?.horaFin ?? "20:00",
    jornada: p?.jornada ?? "dia",
    dotacion: String(p?.dotacion ?? 1),
    desde: p?.vigenteDesde ?? "",
  };
};

export const puestoAInput = (d: DatosPuesto) => {
  const [t, r] = d.patron === "otro" ? [d.trabajo, d.descanso] : d.patron.split("x");
  return {
    nombre: d.nombre.trim(),
    cargoId: d.cargoId,
    diasTrabajo: Number(t),
    diasDescanso: Number(r),
    horaInicio: d.inicio,
    horaFin: d.fin,
    jornada: d.jornada,
    dotacion: Number(d.dotacion) || 1,
    vigenteDesde: d.desde || null,
  };
};
