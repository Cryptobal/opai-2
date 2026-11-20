export type DatosAsistenciaHoy = {
  fecha: string;
  zona: string;
  siguiente: string | null;
  resumen: { turnos: number; presentes: number; sinMarca: number; ausentes: number; incompletos: number; atrasos: number };
  items: Item[];
};

export type Item = {
  personaId: string;
  nombre: string;
  instalacion: string | null;
  turnoInicio: string | null;
  turnoFin: string | null;
  entrada: string | null;
  salida: string | null;
  estado: string;
  atrasoMin: number;
  correccionPendiente: boolean;
  descansoInsuficiente: boolean;
  marcaFueraDeTurno: boolean;
};
