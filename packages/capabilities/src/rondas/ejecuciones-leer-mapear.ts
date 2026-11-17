import { derivarEstado, iso } from "./ejecuciones-comun";

type EjecucionDb = {
  id: string;
  instalacionId: string;
  plantillaId: string;
  adhoc: boolean;
  horaInicio: Date;
  plantilla: { nombre: string; tiempoMaxMin: number; puntos: { id: string }[] };
  cierre: {
    estado: string;
    horaCierre: Date;
    puntosMarcados: number;
    puntosObligatorios: number;
    motivo: string | null;
  } | null;
  marcas: { id: string; puntoId: string; horaCorregida: Date; geocerca: string; anomalias: string[] }[];
};

export function mapearEjecucionDetalle(e: EjecucionDb, nombres: Map<string, string>, ahora: Date) {
  const oblig = e.cierre?.puntosObligatorios ?? e.plantilla.puntos.length;
  return {
    id: e.id,
    instalacionId: e.instalacionId,
    plantillaId: e.plantillaId,
    plantillaNombre: e.plantilla.nombre,
    adhoc: e.adhoc,
    estado: derivarEstado(e.cierre, e.horaInicio, e.plantilla.tiempoMaxMin, ahora),
    horaInicio: iso(e.horaInicio),
    horaCierre: e.cierre ? iso(e.cierre.horaCierre) : null,
    puntosMarcados: e.cierre?.puntosMarcados ?? e.marcas.length,
    puntosObligatorios: oblig,
    anomalias: e.marcas.reduce((n, m) => n + m.anomalias.length, 0),
    motivoCierre: e.cierre?.motivo ?? null,
    marcas: e.marcas.map((m) => ({
      id: m.id,
      puntoId: m.puntoId,
      puntoNombre: nombres.get(m.puntoId) ?? "Punto",
      hora: iso(m.horaCorregida),
      geocerca: m.geocerca,
      anomalias: m.anomalias,
    })),
  };
}