import { z } from "zod";

import { CANALES, GPS_ESTADOS, METODOS, ORIGENES_MARCA, TIPOS_MARCA } from "../domain";

export const uuid = z.string().uuid();

export const marcaVistaSchema = z.object({
  id: z.string(),
  seq: z.number().int(),
  personaId: z.string(),
  tipo: z.enum(TIPOS_MARCA),
  horaServidor: z.string(),
  horaDispositivo: z.string().nullable(),
  desfaseS: z.number().int().nullable(),
  origen: z.enum(ORIGENES_MARCA),
  metodo: z.enum(METODOS),
  canal: z.enum(CANALES).nullable(),
  instalacionId: z.string(),
  gpsEstado: z.enum(GPS_ESTADOS),
  distanciaM: z.number().nullable(),
  turnoEsperadoId: z.string().nullable(),
  turnoInicio: z.string().nullable(),
  turnoFin: z.string().nullable(),
  /** La marca llegó con retraso desde la cola sin conexión (L-03). */
  diferida: z.boolean(),
  hash: z.string(),
});
export type MarcaVista = z.infer<typeof marcaVistaSchema>;

type Fila = {
  id: string; seq: number; personaId: string; tipo: string; horaServidor: Date; horaDispositivo: Date | null;
  desfaseS: number | null; origen: string; metodo: string; canal: string | null; instalacionId: string;
  gpsEstado: string; distanciaM: number | { toNumber(): number } | null; turnoEsperadoId: string | null;
  turnoInicio: Date | null; turnoFin: Date | null; hash: string;
};

export function vistaDeMarca(f: Fila): MarcaVista {
  return {
    id: f.id, seq: f.seq, personaId: f.personaId, tipo: f.tipo as MarcaVista["tipo"],
    horaServidor: f.horaServidor.toISOString(), horaDispositivo: f.horaDispositivo?.toISOString() ?? null,
    desfaseS: f.desfaseS, origen: f.origen as MarcaVista["origen"], metodo: f.metodo as MarcaVista["metodo"],
    canal: f.canal as MarcaVista["canal"], instalacionId: f.instalacionId,
    gpsEstado: f.gpsEstado as MarcaVista["gpsEstado"], distanciaM: f.distanciaM === null ? null : typeof f.distanciaM === "number" ? f.distanciaM : f.distanciaM.toNumber(),
    turnoEsperadoId: f.turnoEsperadoId, turnoInicio: f.turnoInicio?.toISOString() ?? null,
    turnoFin: f.turnoFin?.toISOString() ?? null, diferida: f.origen === "offline_queue", hash: f.hash,
  };
}
