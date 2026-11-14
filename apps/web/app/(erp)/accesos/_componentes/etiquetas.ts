import { formatearFechaHora } from "@opai/domain";

import type { Registro } from "./datos";

type Tono = "neutro" | "success" | "warning" | "danger" | "info" | "accent";

const TIPO_REGISTRO: Record<string, string> = {
  visita: "Visita",
  contratista: "Contratista",
  proveedor: "Proveedor",
  vehiculo: "Vehículo",
  despacho: "Despacho",
};

export const MOTIVO_INTENTO: Record<string, { etiqueta: string; tono: Tono }> = {
  bloqueado: { etiqueta: "Bloqueado", tono: "danger" },
  fuera_de_lista: { etiqueta: "Fuera de lista", tono: "warning" },
  fuera_de_horario: { etiqueta: "Fuera de horario", tono: "warning" },
  uso_unico_consumido: { etiqueta: "Pase ya usado", tono: "neutro" },
};

export const DOC_TIPO: Record<string, string> = {
  run: "RUN",
  pasaporte: "Pasaporte",
  otro: "Documento",
  patente: "Patente",
};

export const tipoDe = (t: string) => TIPO_REGISTRO[t] ?? t;

/** Hora «HH:mm» (24 h) en la zona de la empresa, con el formato común de `@opai/domain`. */
const hora = (valor: string) => formatearFechaHora(valor).slice(11);

/** Hora si es de hoy; si no, «dd-mm · HH:mm» para que una fila de otro día no se lea como de hoy. */
export function cuando(valor: string): string {
  const f = formatearFechaHora(valor);
  return f.slice(0, 10) === formatearFechaHora(new Date()).slice(0, 10)
    ? f.slice(11)
    : `${f.slice(0, 5)} · ${f.slice(11)}`;
}

/** Estado visible de un registro (diseño `Accesos`): en sitio, salió a una hora o diferido (sin conexión). */
export function estadoRegistro(r: Pick<Registro, "salidaEn" | "origen"> & { anulado?: boolean }): {
  etiqueta: string;
  tono: Tono;
} {
  if (r.anulado) return { etiqueta: "Anulado", tono: "danger" };
  if (r.salidaEn) return { etiqueta: `Salió ${hora(r.salidaEn)}`, tono: "neutro" };
  if (r.origen === "diferido") return { etiqueta: "En sitio · diferido", tono: "info" };
  return { etiqueta: "En sitio", tono: "success" };
}

export const OPCIONES_TIPO = Object.entries(TIPO_REGISTRO).map(([valor, etiqueta]) => ({
  valor,
  etiqueta,
}));
export const OPCIONES_MOTIVO = Object.entries(MOTIVO_INTENTO).map(([valor, m]) => ({
  valor,
  etiqueta: m.etiqueta,
}));
