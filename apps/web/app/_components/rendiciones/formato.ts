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

export function kmTexto(km: number): string {
  return km.toLocaleString("es-CL", { maximumFractionDigits: 1 });
}

/** «2026-11-05» → «05-11-2026». Un día sin hora no pasa por zona horaria (si no, se corre un día). */
export function diaIso(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}-${m}-${a}`;
}
