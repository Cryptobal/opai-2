// Columnas del Libro de Remuneraciones Electrónico (LRE) en el orden del índice del «Suplemento LRE» de
// la Dirección del Trabajo (Resolución Exenta N° 285 de 2021, recurso 4 del trámite LRE en dt.gob.cl,
// consultado el 14-nov-2026). Los códigos y nombres salen de ese índice; el texto exacto del encabezado
// del archivo y si la versión vigente agregó columnas siguen POR VERIFICAR (decisión de Carlos del
// 30-oct-2026: todo formato no verificado se muestra con el Badge «Formato por verificar»).

export type ColumnaLre = readonly [codigo: number, nombre: string];

const sindicatos = (base: number, nombre: string): ColumnaLre[] =>
  Array.from({ length: 10 }, (_, i) => [base + i, `${nombre} ${i + 1}`] as const);

export const COLUMNAS_LRE: readonly ColumnaLre[] = [
  // 11xx · Identificación del trabajador
  [1101, "Rut trabajador"], [1102, "Fecha inicio contrato"], [1103, "Fecha de término de contrato"],
  [1104, "Causal de término del contrato"], [1105, "Región de prestación de los servicios"],
  [1106, "Comuna de prestación de los servicios"], [1170, "Tipo de impuesto a la renta"],
  [1146, "Técnico extranjero exención de cotizaciones previsionales"], [1107, "Código tipo de jornada"],
  [1108, "Persona con discapacidad - pensionado por invalidez"], [1109, "Pensionado por vejez"],
  [1141, "AFP"], [1142, "IPS (ExINP)"], [1143, "FONASA - ISAPRE"], [1151, "AFC"], [1110, "CCAF"],
  [1152, "Org. administrador ley 16.744"], [1111, "Nro cargas familiares legales autorizadas"],
  [1112, "Nro de cargas familiares maternales"], [1113, "Nro de cargas familiares invalidez"],
  [1114, "Tramo asignación familiar"], ...sindicatos(1171, "Rut org sindical"),
  [1115, "Nro días trabajados en el mes"], [1116, "Nro días de licencia médica en el mes"],
  [1117, "Nro días de vacaciones en el mes"], [1118, "Subsidio trabajador joven"],
  [1154, "Puesto trabajo pesado"], [1155, "APVI"], [1157, "APVC"],
  [1131, "Indemnización a todo evento"], [1132, "Tasa indemnización a todo evento"],
  // 21xx · Haberes imponibles y tributables
  [2101, "Sueldo"], [2102, "Sobresueldo"], [2103, "Comisiones"], [2104, "Semana corrida"],
  [2105, "Participación"], [2106, "Gratificación"], [2107, "Recargo 30% día domingo"],
  [2108, "Remun. variable pagada en vacaciones"], [2109, "Remun. variable pagada en clausura"],
  [2110, "Aguinaldo"], [2111, "Bonos u otras remun. fijas mensuales"], [2112, "Tratos"],
  [2113, "Bonos u otras remun. variables mensuales o superiores a un mes"],
  [2114, "Ejercicio opción no pactada en contrato"], [2115, "Beneficios en especie constitutivos de remun"],
  [2116, "Remuneraciones bimestrales"], [2117, "Remuneraciones trimestrales"],
  [2118, "Remuneraciones cuatrimestrales"], [2119, "Remuneraciones semestrales"],
  [2120, "Remuneraciones anuales"], [2121, "Participación anual"], [2122, "Gratificación anual"],
  [2123, "Otras remuneraciones superiores a un mes"], [2124, "Pago por horas de trabajo sindical"],
  [2161, "Sueldo empresarial"],
  // 22xx · Haberes imponibles y no tributables
  [2201, "Subsidio por incapacidad laboral por licencia médica"], [2202, "Beca de estudio"],
  [2203, "Gratificaciones de zona"], [2204, "Otros ingresos no constitutivos de renta"],
  // 23xx · Haberes no imponibles y no tributables
  [2301, "Colación"], [2302, "Movilización"], [2303, "Viáticos"], [2304, "Asignación de pérdida de caja"],
  [2305, "Asignación de desgaste herramienta"], [2311, "Asignación familiar legal"],
  [2306, "Gastos por causa del trabajo"], [2307, "Gastos por cambio de residencia"], [2308, "Sala cuna"],
  [2309, "Asignación trabajo a distancia o teletrabajo"], [2347, "Depósito convenido hasta UF 900"],
  [2310, "Alojamiento por razones de trabajo"], [2312, "Asignación de traslación"],
  [2313, "Indemnización por feriado legal"], [2314, "Indemnización años de servicio"],
  [2315, "Indemnización sustitutiva del aviso previo"], [2316, "Indemnización fuero maternal"],
  [2331, "Pago indemnización a todo evento"],
  // 24xx · Haberes no imponibles y tributables
  [2417, "Indemnizaciones voluntarias tributables"], [2418, "Indemnizaciones contractuales tributables"],
  // 31xx · Descuentos
  [3141, "Cotización obligatoria previsional (AFP o IPS)"], [3143, "Cotización obligatoria salud 7%"],
  [3144, "Cotización voluntaria para salud"], [3151, "Cotización AFC - trabajador"],
  [3146, "Cotizaciones técnico extranjero para seguridad social fuera de Chile"],
  [3147, "Descuento depósito convenido hasta UF 900 anual"], [3155, "Cotización APVi Mod A"],
  [3156, "Cotización APVi Mod B hasta UF50"], [3157, "Cotización APVc Mod A"],
  [3158, "Cotización APVc Mod B hasta UF50"], [3161, "Impuesto retenido por remuneraciones"],
  [3162, "Impuesto retenido por indemnizaciones"], [3163, "Mayor retención de impuestos solicitada por el trabajador"],
  [3164, "Impuesto retenido por reliquidación remun. devengadas otros períodos"],
  [3165, "Diferencia impuesto reliquidación remun. devengadas en este período"],
  [3166, "Retención préstamo clase media 2020 (Ley 21.252)"], [3167, "Rebaja zona extrema DL 889"],
  ...sindicatos(3171, "Cuota sindical"), [3110, "Crédito social CCAF"],
  [3181, "Cuota vivienda o educación"], [3182, "Crédito cooperativas de ahorro"],
  [3183, "Otros descuentos autorizados y solicitados por el trabajador"],
  [3154, "Cotización adicional trabajo pesado - trabajador"], [3184, "Donaciones culturales y de reconstrucción"],
  [3185, "Otros descuentos"], [3186, "Pensiones de alimentos"], [3187, "Descuento mujer casada"],
  [3188, "Descuentos por anticipos y préstamos"],
  // 41xx · Aportes del empleador
  [4151, "AFC - Aporte empleador"], [4152, "Aporte empleador seguro accidentes del trabajo y Ley SANNA"],
  [4131, "Aporte empleador indemnización a todo evento"], [4154, "Aporte adicional trabajo pesado - empleador"],
  [4155, "Aporte empleador seguro invalidez y sobrevivencia"], [4157, "APVC - Aporte empleador"],
  // 5xxx · Totales
  [5201, "Total haberes"], [5210, "Total haberes imponibles y tributables"],
  [5220, "Total haberes imponibles no tributables"], [5230, "Total haberes no imponibles y no tributables"],
  [5240, "Total haberes no imponibles y tributables"], [5301, "Total descuentos"],
  [5361, "Total descuentos impuestos a las remuneraciones"], [5362, "Total descuentos impuestos por indemnizaciones"],
  [5341, "Total descuentos por cotizaciones del trabajador"], [5302, "Total otros descuentos"],
  [5410, "Total aportes empleador"], [5501, "Total líquido"], [5502, "Total indemnizaciones"],
  [5564, "Total indemnizaciones tributables"], [5565, "Total indemnizaciones no tributables"],
];
