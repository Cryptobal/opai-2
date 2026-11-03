import { avisoEsSueldoFaltante, avisosCpq, type AvisoCpq, type AvisoServidorCpq } from "./cpq-avisos";

/** Texto compacto cuando falta sueldo: encabezado y resumen, sin repetir el aviso de la línea. */
export const TEXTO_COSTO_PENDIENTE = "Costo pendiente";

export { avisoEsSueldoFaltante };

/** Resumen de la ficha: un solo «Costo pendiente» si falta sueldo; el detalle queda en la línea del puesto. */
export function avisosResumenCpq(calculo: {
  advertencias?: string[];
  avisos?: AvisoServidorCpq[];
}): AvisoCpq[] {
  const todos = avisosCpq(calculo);
  const resto = todos.filter((a) => !avisoEsSueldoFaltante(a));
  if (!todos.some(avisoEsSueldoFaltante)) return resto;
  return [
    {
      id: "costo-pendiente-resumen",
      tono: "warning",
      titulo: TEXTO_COSTO_PENDIENTE,
      bloquea: true,
    },
    ...resto,
  ];
}
