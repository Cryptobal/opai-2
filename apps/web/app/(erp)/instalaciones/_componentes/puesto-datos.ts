import type { Puesto } from "@/lib/tipos-maestros";

export type DatosPuesto = {
  nombre: string;
  cargoId: string | null;
  funcionId: string | null;
  patronId: string | null;
  trabajo: string;
  descanso: string;
  inicio: string;
  fin: string;
  rota: boolean;
  inicioNoche: string;
  finNoche: string;
  jornada: string;
  colacion: string;
  colacionFuera: boolean;
  horas: string;
  desde: string;
};

export const inicialPuesto = (p?: Puesto | null): DatosPuesto => ({
  nombre: p?.nombre ?? "",
  cargoId: p?.cargoId ?? null,
  funcionId: p?.funcionId ?? null,
  patronId: p?.patronId ?? null,
  trabajo: String(p?.diasTrabajo ?? 4),
  descanso: String(p?.diasDescanso ?? 4),
  inicio: p?.horaInicio ?? "08:00",
  fin: p?.horaFin ?? "20:00",
  rota: Boolean(p?.horaInicioNoche && p?.horaFinNoche),
  inicioNoche: p?.horaInicioNoche ?? "20:00",
  finNoche: p?.horaFinNoche ?? "08:00",
  jornada: p?.jornada ?? "dia",
  colacion: String(p?.colacionMin ?? 0),
  colacionFuera: p?.colacionFuera ?? false,
  horas: p?.horasSemanales != null ? String(p.horasSemanales) : "",
  desde: p?.vigenteDesde ?? "",
});

export const puestoAInput = (d: DatosPuesto) => {
  const horas = d.horas.trim() === "" ? null : Number(d.horas);
  return {
    nombre: d.nombre.trim(),
    cargoId: d.cargoId,
    funcionId: d.funcionId,
    patronId: d.patronId,
    diasTrabajo: Number(d.trabajo) || 1,
    diasDescanso: Number(d.descanso) || 1,
    horaInicio: d.inicio,
    horaFin: d.fin,
    horaInicioNoche: d.rota ? d.inicioNoche : null,
    horaFinNoche: d.rota ? d.finNoche : null,
    jornada: d.jornada,
    colacionMin: Number(d.colacion) || 0,
    colacionFuera: d.colacionFuera,
    ...(horas != null && Number.isFinite(horas) ? { horasSemanales: horas } : {}),
    vigenteDesde: d.desde || null,
  };
};
