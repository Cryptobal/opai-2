import { avisosCpq, type AvisoServidorCpq } from "./cpq-avisos";
import { pesos as clp } from "./fechas";

type Calculo = {
  ventaMensual?: number | null;
  noEnviable?: boolean;
  advertencias?: string[];
  avisos?: AvisoServidorCpq[];
};

/**
 * Texto al terminar «Recalcular» (CAR-162): qué cambió o, si nada cambió, qué falta. Nunca revela
 * costos: solo venta (visible sin `cpq:costos.ver`) y las causas tipadas, que no llevan montos.
 */
export function resumenRecalculo(antes: Calculo, despues: Calculo): { tono: "exito" | "info"; texto: string } {
  const ventaAntes = antes.ventaMensual ?? null;
  const ventaDespues = despues.ventaMensual ?? null;
  const pendientes = avisosCpq(despues).filter((a) => a.bloquea);
  if (ventaAntes == null && ventaDespues != null) {
    return { tono: "exito", texto: `Costo calculado: venta mensual ${clp(ventaDespues)}.` };
  }
  if (ventaAntes != null && ventaDespues != null && ventaAntes !== ventaDespues) {
    return { tono: "exito", texto: `Venta mensual: ${clp(ventaAntes)} → ${clp(ventaDespues)}.` };
  }
  if (ventaAntes != null && ventaDespues == null) {
    const causa = pendientes[0]?.titulo ?? "faltan datos";
    return { tono: "info", texto: `El costo quedó pendiente: ${minuscula(causa)}.` };
  }
  if (pendientes.length > 0) {
    const faltan = pendientes.slice(0, 2).map((a) => minuscula(a.titulo)).join("; ");
    return { tono: "info", texto: `Sin cambios: ${faltan}.` };
  }
  return { tono: "info", texto: "Sin cambios: la cotización ya estaba al día." };
}

function minuscula(t: string) {
  return t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, "");
}
