import { normalizarRut } from "../rut";

/**
 * Certificado F30-1 (cumplimiento laboral y previsional), texto plano por verificar.
 * OPAI no lo envía a la DT: lo revisa y firma el representante (R11).
 */
export type ResumenF301 = {
  trabajadores: number;
  totalLiquido: number;
  totalImponible: number;
};

export type CertificadoF301 = {
  nombre: string;
  contenido: string;
  filas: number;
  errores: { personaId: string | null; mensaje: string }[];
  advertencias: string[];
};

const ADVERTENCIAS = [
  "Formato por verificar: contrastar con el certificado F30-1 vigente en Mi DT antes del primer uso.",
  "Este archivo no sustituye la firma del representante laboral electrónico.",
];

export function archivoF301(input: {
  rutEmpleador: string;
  razonSocial?: string | null;
  anio: number;
  mes: number;
  resumen: ResumenF301;
}): CertificadoF301 {
  const errores: CertificadoF301["errores"] = [];
  const rut = input.rutEmpleador.trim();
  if (!rut) errores.push({ personaId: null, mensaje: "Falta el RUT del empleador en Ajustes o en los datos de la empresa." });
  if (input.resumen.trabajadores === 0) errores.push({ personaId: null, mensaje: "El período no tiene liquidaciones con contrato vigente." });
  const norm = normalizarRut(rut);
  const cuerpo = norm ? norm.split("-")[0]! : "00000000";
  const nombre = `f30_1_${cuerpo}_${String(input.mes).padStart(2, "0")}${input.anio}.txt`;
  const periodo = `${String(input.mes).padStart(2, "0")}/${input.anio}`;
  const lineas = [
    "CERTIFICADO DE CUMPLIMIENTO DE OBLIGACIONES LABORALES Y PREVISIONALES (F30-1)",
    "Generado por OPAI · FORMATO POR VERIFICAR",
    "",
    `RUT empleador: ${rut || "(sin RUT)"}`,
    input.razonSocial?.trim() ? `Razón social: ${input.razonSocial.trim()}` : null,
    `Período de remuneraciones: ${periodo}`,
    `Trabajadores con liquidación en el mes: ${input.resumen.trabajadores}`,
    `Total líquido a pago (CLP): ${input.resumen.totalLiquido}`,
    `Total imponible previsional (CLP): ${input.resumen.totalImponible}`,
    "",
    "Declaración (texto orientativo, por verificar):",
    "Se declara que las obligaciones laborales y previsionales del período fueron",
    "cumplidas conforme a la legislación vigente, según los registros de nómina en OPAI.",
    "",
    "Representante laboral electrónico: ...............................................",
    "Fecha: ____/____/________",
  ].filter((l): l is string => l !== null);
  return {
    nombre,
    contenido: `${lineas.join("\r\n")}\r\n`,
    filas: input.resumen.trabajadores,
    errores,
    advertencias: ADVERTENCIAS,
  };
}