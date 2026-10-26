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
  /** El usuario escribió las horas: solo entonces se envían (si no, el servidor las recalcula). */
  horasTocadas: boolean;
  desde: string;
};

/** Campos que cambian las horas semanales sugeridas (igual que CLAVES_HORAS del servidor). */
const AFECTAN_HORAS = new Set<keyof DatosPuesto>([
  "patronId",
  "inicio",
  "fin",
  "rota",
  "inicioNoche",
  "finNoche",
  "colacion",
  "colacionFuera",
]);

/**
 * Cambia un campo. Si afecta las horas y el usuario no las escribió, el valor mostrado se vacía:
 * el servidor las recalcula al guardar (antes se reenviaban las horas viejas, revisión 5658390255).
 */
export function conCambio<K extends keyof DatosPuesto>(x: DatosPuesto, k: K, v: DatosPuesto[K]) {
  const limpiar = AFECTAN_HORAS.has(k) && !x.horasTocadas && x[k] !== v;
  return { ...x, [k]: v, ...(limpiar ? { horas: "" } : {}) };
}

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
  horasTocadas: false,
  desde: p?.vigenteDesde ?? "",
});

export const puestoAInput = (d: DatosPuesto) => {
  // Vacío = que el servidor las sugiera (null); sin tocar = no se envían.
  const horas = d.horas.trim() === "" ? null : Number(d.horas);
  const horasValidas = horas === null || Number.isFinite(horas);
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
    ...(d.horasTocadas && horasValidas ? { horasSemanales: horas } : {}),
    vigenteDesde: d.desde || null,
  };
};
