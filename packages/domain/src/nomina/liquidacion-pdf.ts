export type LineaLiquidacionPdf = { concepto: string; monto: number };

export type DatosLiquidacionPdf = {
  empresa: string;
  periodo: string;
  rut: string;
  nombre: string;
  diasTrabajados: number;
  haberes: readonly LineaLiquidacionPdf[];
  descuentosLegales: readonly LineaLiquidacionPdf[];
  otrosDescuentos: readonly LineaLiquidacionPdf[];
  liquido: number;
  imponible: number;
  costoEmpresa: number;
};

export function nombreLiquidacionPdf(anio: number, mes: number, rut: string) {
  return `liquidacion_${anio}${String(mes).padStart(2, "0")}_${rut.replace(/\./g, "")}.pdf`;
}