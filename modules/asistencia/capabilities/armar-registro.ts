import type { TenantTx } from "@opai/db";
import { distanciaMetros } from "@opai/domain";

import {
  elegirTurno, resolverTipo,
  type Canal, type GpsEstado, type Metodo, type RegistroMarca, type TipoMarca,
} from "../domain";

const redondear = (n: number, d: number): number => Math.round(n * 10 ** d) / 10 ** d;
const COLACION: readonly TipoMarca[] = ["inicio_colacion", "fin_colacion"];
const H = 3_600_000;

export type EntradaMarca = {
  claveDispositivo: string; origen: "en_linea" | "offline_queue"; tipo?: TipoMarca | undefined;
  horaDispositivo?: string | undefined; canal?: Canal | undefined; dispositivoId?: string | undefined;
  lat?: number | undefined; lng?: number | undefined; precisionM?: number | undefined;
};

export type DatosMarca = {
  tenantId: string; seq: number; personaId: string; radioM: number;
  /** Resolución de jornada excepcional de la persona (número y fecha), si la tiene. */
  resolucion: { numero: string; fecha: string } | null;
  instalacion: {
    id: string; nombre: string; lat: { toNumber(): number } | null; lng: { toNumber(): number } | null;
    cuenta: { razonSocial: string | null; rut: string | null; nombre: string };
  };
  identidad: { metodo: Metodo; motivoRespaldo: string | null; confianza: number | null; pruebaVida: boolean | null };
};

type Db = Pick<TenantTx, "marca" | "turnoEsperado">;

/** Fotografía de empleador, establecimiento, mandante y resolución: no se recalcula desde los maestros. */
export function snapshotDe(
  instalacion: DatosMarca["instalacion"],
  resolucion: DatosMarca["resolucion"],
) {
  return {
    empleadorRazonSocial: null, empleadorRut: null, establecimiento: instalacion.nombre,
    mandanteRazonSocial: instalacion.cuenta.razonSocial ?? instalacion.cuenta.nombre,
    mandanteRut: instalacion.cuenta.rut, resolucionJornada: resolucion,
  };
}

/**
 * Arma el registro canónico de la marca con la hora del servidor, el tipo que toca y el turno
 * esperado. Se llama DENTRO de la transacción, con la cadena ya bloqueada: así dos marcas de la misma
 * persona no ven las mismas previas y `hora_servidor` sigue el orden de `seq`. Los números se redondean
 * a la escala de la columna para que el hash se pueda recalcular desde lo guardado.
 */
export async function armarRegistro(db: Db, d: DatosMarca, i: EntradaMarca): Promise<RegistroMarca> {
  const ahora = new Date();
  const previas = await db.marca.findMany({
    where: { personaId: d.personaId, horaServidor: { gte: new Date(ahora.getTime() - 26 * H) } },
    select: { tipo: true, horaServidor: true },
  });
  const tipo: TipoMarca =
    i.tipo && COLACION.includes(i.tipo)
      ? i.tipo
      : resolverTipo(previas.map((p) => ({ tipo: p.tipo as TipoMarca, horaServidor: p.horaServidor })), ahora);
  const turnos = await db.turnoEsperado.findMany({
    where: {
      personaId: d.personaId, vigente: true,
      inicio: { gte: new Date(ahora.getTime() - 26 * H), lte: new Date(ahora.getTime() + 12 * H) },
    },
  });
  const turno = elegirTurno(turnos, ahora, tipo);
  let gpsEstado: GpsEstado = "sin_gps";
  let distanciaM: number | null = null;
  if (i.lat != null && i.lng != null && d.instalacion.lat && d.instalacion.lng) {
    distanciaM = redondear(
      distanciaMetros({ lat: d.instalacion.lat.toNumber(), lng: d.instalacion.lng.toNumber() }, { lat: i.lat, lng: i.lng }),
      2,
    );
    gpsEstado = distanciaM <= d.radioM ? "dentro" : "fuera"; // fuera de rango solo alerta
  }
  const horaDispositivo = i.horaDispositivo ? new Date(i.horaDispositivo) : null;
  return {
    tenantId: d.tenantId, seq: d.seq, personaId: d.personaId, tipo, horaServidor: ahora, horaDispositivo,
    desfaseS: horaDispositivo ? Math.round((ahora.getTime() - horaDispositivo.getTime()) / 1000) : null,
    origen: i.origen, metodo: d.identidad.metodo, motivoRespaldo: d.identidad.motivoRespaldo,
    confianza: d.identidad.confianza === null ? null : redondear(d.identidad.confianza, 4),
    pruebaVida: d.identidad.pruebaVida, dispositivoId: i.dispositivoId ?? null, canal: i.canal ?? null,
    instalacionId: d.instalacion.id,
    lat: i.lat == null ? null : redondear(i.lat, 6), lng: i.lng == null ? null : redondear(i.lng, 6),
    precisionM: i.precisionM == null ? null : redondear(i.precisionM, 2), gpsEstado, distanciaM,
    turnoEsperadoId: turno?.id ?? null, turnoInicio: turno?.inicio ?? null, turnoFin: turno?.fin ?? null,
    snapshot: snapshotDe(d.instalacion, d.resolucion),
    idempotencyKey: i.claveDispositivo,
  };
}
