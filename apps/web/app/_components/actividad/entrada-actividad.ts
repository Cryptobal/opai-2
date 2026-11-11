import { diaEnZona, instanteEnZona } from "@opai/domain";

import type { TipoCompositor } from "@opai/ds";

import type { Borrador } from "./campos-actividad";

const horaAhora = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Santiago",
  }).format(d);

/** Borrador vacío: «ocurrió» ahora; una tarea vence mañana a las 09:00. */
export function borradorInicial(ahora = new Date()): Borrador {
  return {
    texto: "",
    dia: diaEnZona(ahora),
    hora: horaAhora(ahora),
    tocoFecha: false,
    todoElDia: false,
    prioridad: "media",
    responsables: [],
    asistentes: "",
    acuerdos: "",
    resultado: "contesto",
    respuestaCliente: false,
  };
}

/** Input de core.actividades.create a partir del borrador (título = primera línea, hasta 200). */
export function entradaActividad(
  tipo: TipoCompositor,
  b: Borrador,
  vinculos: { tipo: string; id: string }[],
) {
  const texto = b.texto.trim();
  const primera = (texto.split("\n")[0] ?? "").trim();
  const titulo = primera.length > 200 ? `${primera.slice(0, 199)}…` : primera;
  const cuando =
    b.dia && (tipo === "tarea" || b.tocoFecha)
      ? instanteEnZona(b.dia, b.todoElDia && tipo === "tarea" ? "23:59" : b.hora || "09:00")
      : null;
  return {
    tipo,
    titulo,
    ...(texto !== titulo ? { detalle: texto } : {}),
    vinculos,
    ...(tipo === "tarea"
      ? {
          ...(cuando ? { vencimiento: cuando } : {}),
          todoElDia: b.todoElDia,
          prioridad: b.prioridad,
          responsables: b.responsables,
        }
      : cuando
        ? { ocurrioEn: cuando }
        : {}),
    ...(tipo === "llamada" ? { resultado: b.resultado } : {}),
    ...(tipo !== "tarea" && b.respuestaCliente ? { respuestaCliente: true } : {}),
    ...(tipo === "reunion"
      ? {
          asistentes: b.asistentes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 30),
          ...(b.acuerdos.trim() ? { acuerdos: b.acuerdos.trim() } : {}),
        }
      : {}),
  };
}
