// Hash de la marca (L-17): SHA-256 sobre el registro canónico COMPLETO —snapshot, método, confianza,
// dispositivo, ubicación y hora del servidor—, encadenado por empresa. 1.0 hasheaba solo una parte.

import { hashEncadenado, jsonCanonico, sha256Hex } from "@opai/domain";

import type { Canal, GpsEstado, Metodo, OrigenMarca, TipoMarca } from "./tipos";

export type SnapshotMarca = {
  empleadorRazonSocial: string | null;
  empleadorRut: string | null;
  establecimiento: string | null;
  /** Mandante o EST donde presta servicios, con su razón social y RUT. */
  mandanteRazonSocial: string | null;
  mandanteRut: string | null;
  /** Resolución de jornada excepcional (número y fecha), si la hay. */
  resolucionJornada: { numero: string; fecha: string } | null;
};

export type RegistroMarca = {
  tenantId: string;
  seq: number;
  personaId: string;
  tipo: TipoMarca;
  horaServidor: Date;
  horaDispositivo: Date | null;
  desfaseS: number | null;
  origen: OrigenMarca;
  metodo: Metodo;
  motivoRespaldo: string | null;
  confianza: number | null;
  pruebaVida: boolean | null;
  dispositivoId: string | null;
  canal: Canal | null;
  instalacionId: string;
  lat: number | null;
  lng: number | null;
  precisionM: number | null;
  gpsEstado: GpsEstado;
  distanciaM: number | null;
  turnoEsperadoId: string | null;
  turnoInicio: Date | null;
  turnoFin: Date | null;
  snapshot: SnapshotMarca;
  idempotencyKey: string;
};

/** Texto canónico: claves ordenadas, fechas en ISO, sin campos omitidos (los nulos cuentan). */
export function canonDeMarca(r: RegistroMarca): string {
  return jsonCanonico({ v: 1, ...r });
}

export const hashDeMarca = (hashAnterior: string, r: RegistroMarca): Promise<string> =>
  hashEncadenado(hashAnterior, canonDeMarca(r));

/** Código corto de verificación del comprobante: los 10 primeros caracteres del hash, en mayúsculas. */
export async function codigoVerificacion(hash: string): Promise<string> {
  return (await sha256Hex(`verificacion:${hash}`)).slice(0, 10).toUpperCase();
}

/** ¿El hash guardado corresponde al registro y a su eslabón anterior? */
export async function marcaIntegra(hash: string, hashAnterior: string, r: RegistroMarca): Promise<boolean> {
  return (await hashDeMarca(hashAnterior, r)) === hash;
}
