import { COMUNICABLES_ACTIVIDADES } from "./actividades";
import { COMUNICABLES_ASISTENCIA } from "./asistencia";
import { COMUNICABLES_CONTINGENCIA } from "./asistencia-contingencia";
import { COMUNICABLES_DESCANSO } from "./asistencia-descanso";
import { COMUNICABLES_GEOCERCA } from "./asistencia-geocerca";
import { COMUNICABLES_LIMITES } from "./asistencia-limites";
import { COMUNICABLES_CUMPLIMIENTO } from "./cumplimiento";
import { COMUNICABLES_COMERCIAL } from "./comercial";
import { COMUNICABLES_CPQ } from "./cpq";
import { COMUNICABLES_DESEMPENO } from "./desempeno";
import { COMUNICABLES_DOCUMENTOS } from "./documentos";
import { COMUNICABLES_FINANZAS } from "./finanzas";
import { COMUNICABLES_PRUEBAS } from "./pruebas";
import { COMUNICABLES_RENDICIONES } from "./rendiciones";
import { COMUNICABLES_SISTEMA } from "./sistema";
import { COMUNICABLES_TICKETS } from "./tickets";
import type { EventoComunicable } from "./tipos";
import { COMUNICABLES_USUARIOS } from "./usuarios";

export * from "./correo";
export type {
  Canal,
  EventoComunicable,
  PlantillaBase,
  TipoVariable,
  VariableComunicable,
} from "./tipos";

export const COMUNICABLES_NUCLEO: readonly EventoComunicable[] = [
  ...COMUNICABLES_USUARIOS,
  ...COMUNICABLES_DOCUMENTOS,
  ...COMUNICABLES_SISTEMA,
  ...COMUNICABLES_PRUEBAS,
  ...COMUNICABLES_CUMPLIMIENTO,
  ...COMUNICABLES_COMERCIAL,
  ...COMUNICABLES_CPQ,
  ...COMUNICABLES_FINANZAS,
  ...COMUNICABLES_ACTIVIDADES,
  ...COMUNICABLES_ASISTENCIA,
  ...COMUNICABLES_CONTINGENCIA,
  ...COMUNICABLES_DESCANSO,
  ...COMUNICABLES_GEOCERCA,
  ...COMUNICABLES_LIMITES,
  ...COMUNICABLES_DESEMPENO,
  ...COMUNICABLES_TICKETS,
  ...COMUNICABLES_RENDICIONES,
];

/** Datos de ejemplo anidados a partir de las rutas declaradas ("documento.tipo" → { documento: { tipo } }). */
export function ejemplosDe(e: EventoComunicable): Record<string, unknown> {
  const datos: Record<string, unknown> = {};
  for (const variable of e.variables) {
    const partes = variable.ruta.split(".");
    let nodo = datos;
    for (const p of partes.slice(0, -1)) nodo = (nodo[p] ??= {}) as Record<string, unknown>;
    nodo[partes.at(-1) as string] = variable.ejemplo;
  }
  return datos;
}

export const rutasDe = (e: EventoComunicable) => e.variables.map((v) => v.ruta);
