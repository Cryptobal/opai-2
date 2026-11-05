import { type RegistroMarca, type SnapshotMarca } from "../domain";
import type { Canal, GpsEstado, Metodo, OrigenMarca, TipoMarca } from "../domain";

type Num = number | { toNumber(): number } | null;
const n = (v: Num): number | null => (v === null ? null : typeof v === "number" ? v : v.toNumber());

export type FilaMarca = {
  tenantId: string; seq: number; personaId: string; tipo: string; horaServidor: Date;
  horaDispositivo: Date | null; desfaseS: number | null; origen: string; metodo: string;
  motivoRespaldo: string | null; confianza: Num; pruebaVida: boolean | null; dispositivoId: string | null;
  canal: string | null; instalacionId: string; lat: Num; lng: Num; precisionM: Num; gpsEstado: string;
  distanciaM: Num; turnoEsperadoId: string | null; turnoInicio: Date | null; turnoFin: Date | null;
  snapshot: unknown; idempotencyKey: string;
};

/** El registro canónico que se hasheó, reconstruido desde lo que guarda la base (para verificar). */
export function registroDeFila(f: FilaMarca): RegistroMarca {
  return {
    tenantId: f.tenantId, seq: f.seq, personaId: f.personaId, tipo: f.tipo as TipoMarca,
    horaServidor: f.horaServidor, horaDispositivo: f.horaDispositivo, desfaseS: f.desfaseS,
    origen: f.origen as OrigenMarca, metodo: f.metodo as Metodo, motivoRespaldo: f.motivoRespaldo,
    confianza: n(f.confianza), pruebaVida: f.pruebaVida, dispositivoId: f.dispositivoId,
    canal: f.canal as Canal | null, instalacionId: f.instalacionId, lat: n(f.lat), lng: n(f.lng),
    precisionM: n(f.precisionM), gpsEstado: f.gpsEstado as GpsEstado, distanciaM: n(f.distanciaM),
    turnoEsperadoId: f.turnoEsperadoId, turnoInicio: f.turnoInicio, turnoFin: f.turnoFin,
    snapshot: f.snapshot as SnapshotMarca, idempotencyKey: f.idempotencyKey,
  };
}
