/** Salida de `pauta.dotacion.listar` en la ficha de instalación (CAR-596). */
export type DotacionInstalacion = {
  instalacionId: string;
  anio: number;
  mes: number;
  hoy: string;
  vinculos: { id: string; nombre: string }[];
  puestos: DotacionPuesto[];
};

export type DotacionPuesto = {
  id: string;
  nombre: string;
  funcion: string | null;
  horario: string;
  serie: {
    titularId: string | null;
    titular: string | null;
  } | null;
  reemplazos: TramoPersona[];
  refuerzos: TramoPersona[];
  vacantes: TramoVacante[];
};

type TramoPersona = { personaId: string; persona: string; desde: string; hasta: string; dias: number };
type TramoVacante = {
  motivo: "sin_titular" | "ausencia" | "licencia" | "vacaciones" | "permiso";
  desde: string;
  hasta: string;
  dias: number;
};