/** Consulta al SII en lote del importador (CAR-156), tal como la devuelve `comercial.importar_1_0`. */
export type ResumenSiiImport = {
  estado: "disponible" | "no_configurado" | "error";
  cuentasConRut: number;
  enCache: number;
  completables: number;
  porConsultar: number;
  encoladas: number;
};

/** Una línea para la vista previa y el resultado: qué sabe el SII de las cuentas, sin aplicar nada. */
export function textoResumenSii(s: ResumenSiiImport, aplicada: boolean): string {
  if (!s.cuentasConRut) return "Datos del SII: ninguna cuenta trae RUT.";
  if (s.estado === "no_configurado")
    return "Datos del SII: sin consultar; falta la integración «Datos del SII por RUT» en Configuración › Integraciones.";
  if (s.estado === "error")
    return "Datos del SII: no se pudieron revisar ahora; la importación no cambia por esto.";
  const cola = aplicada
    ? s.encoladas
      ? ` · ${s.encoladas} en consulta (unos minutos)`
      : ""
    : s.porConsultar
      ? ` · ${s.porConsultar} se consultarán al aplicar`
      : "";
  return `Datos del SII: ${s.enCache} de ${s.cuentasConRut} cuentas con RUT ya consultadas, ${s.completables} con datos para completar${cola}. Se revisan y aplican en cada ficha con «Consultar SII».`;
}
