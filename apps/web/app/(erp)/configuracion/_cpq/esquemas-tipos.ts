export type TramoEsquema = {
  id: string;
  nombre: string;
  patronId: string;
  patronNombre: string;
  horaInicio: string;
  horaFin: string;
  diasSemana: number[];
  posiciones: number;
};

export type EsquemaCobertura = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  totalPuestos: number;
  tramos: TramoEsquema[];
};

export type CicloTurno = { id: string; nombre: string; resumen: string };

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** «4 puestos · 2 tramos» para la lista. */
export function resumenEsquema(e: Pick<EsquemaCobertura, "totalPuestos" | "tramos">): string {
  const p = e.totalPuestos === 1 ? "1 puesto" : `${e.totalPuestos} puestos`;
  const t = e.tramos.length === 1 ? "1 tramo" : `${e.tramos.length} tramos`;
  return `${p} · ${t}`;
}
