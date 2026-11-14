// Señales que vigila la central (spec R1, R2, R4, R4a, R5 y pregunta 6). Puro: sin base de datos.

import { pesoSeveridad, type Severidad } from "./index";

export type Senal = { evento: string; nombre: string; severidad: Severidad; fija?: boolean };

/**
 * Catálogo inicial por fuente. Cada módulo publica el hecho con su propio umbral (Asistencia: minutos
 * sin marca; Rondas: ventana y tramos) y la central decide si abre o agrupa una alerta. Un botón de
 * emergencia es siempre crítico (R5) y su severidad no se puede cambiar.
 */
export const SENALES: readonly Senal[] = [
  { evento: "asistencia.alerta.sin_marca_inicio", nombre: "No marcó entrada", severidad: "alta" },
  { evento: "asistencia.alerta.sin_marca_termino", nombre: "No marcó salida", severidad: "media" },
  { evento: "rondas.ejecucion.no_realizada", nombre: "Ronda no iniciada", severidad: "alta" },
  { evento: "rondas.ejecucion.atrasada", nombre: "Ronda atrasada", severidad: "media" },
  { evento: "rondas.ejecucion.incompleta", nombre: "Ronda incompleta", severidad: "media" },
  { evento: "rondas.punto.omitido", nombre: "Punto obligatorio saltado", severidad: "media" },
  { evento: "rondas.anomalia.detectada", nombre: "Anomalía en la ronda", severidad: "alta" },
  { evento: "rondas.novedad.grave", nombre: "Incidente en terreno", severidad: "alta" },
  { evento: "rondas.emergencia", nombre: "Botón de emergencia", severidad: "critica", fija: true },
];

export const senalDe = (evento: string) => SENALES.find((s) => s.evento === evento) ?? null;

/** Ventana en que señales de la misma instalación y persona se juntan en una alerta (R4). */
export const VENTANA_AGRUPACION_MIN = 10;

type Abierta = { id: string; instalacionId: string; personaId: string | null; origen: string; createdAt: Date };

/**
 * Alerta abierta a la que se suma una señal nueva, o null si hay que abrir otra (R4, R4a): misma
 * instalación y misma persona (o ambas sin persona), y además el mismo evento (una sola alerta por
 * guardia y evento) o abierta hace menos de la ventana.
 */
export function alertaParaAgrupar<A extends Abierta>(
  abiertas: readonly A[],
  s: { instalacionId: string; personaId: string | null; evento: string },
  ahora: Date,
): A | null {
  const desde = ahora.getTime() - VENTANA_AGRUPACION_MIN * 60_000;
  const candidatas = abiertas.filter(
    (a) =>
      a.instalacionId === s.instalacionId &&
      a.personaId === s.personaId &&
      (a.origen === s.evento || a.createdAt.getTime() >= desde),
  );
  return candidatas.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())[0] ?? null;
}

/** La severidad solo sube sola (R5). */
export const masGrave = (a: Severidad, b: Severidad): Severidad => (pesoSeveridad(a) <= pesoSeveridad(b) ? a : b);
