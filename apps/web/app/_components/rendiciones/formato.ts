import { fechaCorta } from "@/lib/formato";
import { pesos } from "@/lib/fechas";

import type { ResumenRendicion } from "./tipos";

export { pesos };

/** Fecha que se muestra en la tarjeta: cuándo se envió o, si aún es borrador, cuándo se creó. */
export function fechaDe(r: Pick<ResumenRendicion, "creadaEn" | "enviadaEn">): string {
  return fechaCorta(r.enviadaEn ?? r.creadaEn);
}

/** «Revisa: Ana Pérez», o por elegir mientras no tenga aprobador. */
export function revisaDe(r: Pick<ResumenRendicion, "aprobadorNombre" | "aprobadorId">): string {
  return r.aprobadorId
    ? `Revisa: ${r.aprobadorNombre ?? "aprobador asignado"}`
    : "Revisa: por elegir";
}

/** Línea secundaria de la tarjeta según el estado, como en el diseño aprobado (5-nov-2026). */
export function lineaEstado(
  r: Pick<
    ResumenRendicion,
    "estado" | "creadaEn" | "enviadaEn" | "decididaEn" | "aprobadorId" | "aprobadorNombre"
  >,
): string {
  const dia = (v: string | null) => (v ? fechaCorta(v) : "—");
  switch (r.estado) {
    case "borrador":
      return `${dia(r.creadaEn)} · borrador`;
    case "enviada":
      return revisaDe(r).replace("Revisa: ", "Revisa ");
    case "devuelta":
      return `Devuelta el ${dia(r.decididaEn)}`;
    case "aprobada":
      return `Aprobada el ${dia(r.decididaEn)}`;
    case "pagada":
      return `Pagada el ${dia(r.decididaEn)}`;
    case "rechazada":
      return `Rechazada el ${dia(r.decididaEn)}`;
    default:
      return `Anulada · ${dia(r.creadaEn)}`;
  }
}

export function kmTexto(km: number): string {
  return km.toLocaleString("es-CL", { maximumFractionDigits: 1 });
}

/** «2026-11-05» → «05-11-2026». Un día sin hora no pasa por zona horaria (si no, se corre un día). */
export function diaIso(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}-${m}-${a}`;
}
