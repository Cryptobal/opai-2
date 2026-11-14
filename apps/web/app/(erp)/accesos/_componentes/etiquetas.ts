import type { Registro } from "./datos";

type Tono = "neutro" | "success" | "warning" | "danger" | "info" | "accent";

export const TIPO_REGISTRO: Record<string, string> = {
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

/** Hora corta en la zona de la empresa (America/Santiago por defecto). */
export function hora(valor: string, zona = "America/Santiago"): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zona,
  }).format(new Date(valor));
}

/** Estado visible de un registro (diseño `Accesos`): en sitio, salió a una hora o diferido (sin conexión). */
export function estadoRegistro(r: Pick<Registro, "salidaEn" | "origen">): {
  etiqueta: string;
  tono: Tono;
} {
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
