import type { ModoPunto } from "@opai/domain";

import type { DefectosRondas, Punto } from "./tipos";

/** Estado del formulario del punto: strings en los numéricos; vacío = heredar el valor del tenant. */
export type DatosPunto = {
  nombre: string;
  instrucciones: string;
  modo: ModoPunto;
  estricto: boolean;
  latitud: string;
  longitud: string;
  radioM: string;
  precisionMinM: string;
  permanenciaS: string;
  exigeFoto: boolean;
};

const txt = (v: number | null | undefined) => (v == null ? "" : String(v));

/** Datos iniciales: el punto existente, o los valores por defecto del tenant para uno nuevo. */
export function inicialPunto(punto: Punto | null, defectos: DefectosRondas): DatosPunto {
  return {
    nombre: punto?.nombre ?? "",
    instrucciones: punto?.instrucciones ?? "",
    modo: punto?.modo ?? defectos.modo,
    estricto: punto?.estricto ?? false,
    latitud: txt(punto?.latitud ?? null),
    longitud: txt(punto?.longitud ?? null),
    radioM: txt(punto?.radioM ?? null),
    precisionMinM: txt(punto?.precisionMinM ?? null),
    permanenciaS: punto ? String(punto.permanenciaS) : "",
    exigeFoto: punto?.exigeFoto ?? false,
  };
}

const gps = (m: ModoPunto) => m === "gps" || m === "qr_gps";
const entero = (s: string) => (s.trim() === "" ? null : Number.parseInt(s, 10));
const decimal = (s: string) => (s.trim() === "" ? null : Number.parseFloat(s));

/** Convierte el formulario al input de `rondas.puntos.crear/actualizar`. Vacío = heredar (null/omitir). */
export function puntoAInput(d: DatosPunto, instalacionId: string, id: string | null) {
  const base: Record<string, unknown> = {
    nombre: d.nombre.trim(),
    modo: d.modo,
    estricto: d.estricto,
    exigeFoto: d.exigeFoto,
    instrucciones: d.instrucciones.trim() === "" ? null : d.instrucciones.trim(),
  };
  const perm = entero(d.permanenciaS);
  if (perm != null) base["permanenciaS"] = perm;
  if (gps(d.modo)) {
    base["latitud"] = decimal(d.latitud);
    base["longitud"] = decimal(d.longitud);
    // null = heredar el valor del tenant; el backend resuelve la herencia (R1).
    base["radioM"] = entero(d.radioM);
    base["precisionMinM"] = entero(d.precisionMinM);
  }
  return id ? { id, ...base } : { instalacionId, ...base };
}
