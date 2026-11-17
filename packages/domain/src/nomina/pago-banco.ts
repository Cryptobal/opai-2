import { normalizarRut } from "../rut";

export type FilaPagoBanco = {
  personaId: string;
  rut: string;
  nombre: string;
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string;
  montoClp: number;
};

export type ArchivoPagoBanco = {
  nombre: string;
  contenido: string;
  filas: number;
  errores: { personaId: string | null; mensaje: string }[];
  advertencias: string[];
};

const ADVERTENCIAS = (formato: string | null) => [
  "Archivo de transferencias masivas · FORMATO POR VERIFICAR con el banco configurado en Ajustes.",
  formato?.trim() ? `Formato indicado en Ajustes: ${formato.trim()}.` : "Indica el formato del banco en Remuneraciones › Ajustes › Pago.",
  "Solo se incluyen personas con liquidación en el período y cuenta bancaria por defecto.",
];

const esc = (v: string) => v.replaceAll(";", ",");

/** Nombre del archivo de pago bancario del período. */
export function nombrePagoBanco(anio: number, mes: number, rutEmpleador: string): string {
  const norm = normalizarRut(rutEmpleador.trim());
  const cuerpo = norm ? norm.split("-")[0]! : "00000000";
  return `pago_banco_${cuerpo}_${String(mes).padStart(2, "0")}${anio}.csv`;
}

/** CSV separado por «;» con montos líquidos y cuentas para nómina masiva del banco. */
export function archivoPagoBanco(input: {
  rutEmpleador: string;
  anio: number;
  mes: number;
  formatoBanco: string | null;
  filas: readonly FilaPagoBanco[];
  erroresPrevios: readonly { personaId: string | null; mensaje: string }[];
}): ArchivoPagoBanco {
  const errores = [...input.erroresPrevios];
  const rut = input.rutEmpleador.trim();
  if (!rut) errores.push({ personaId: null, mensaje: "Falta el RUT del empleador en Ajustes o en los datos de la empresa." });
  const cabecera = "rut;nombre;banco_codigo;tipo_cuenta;numero_cuenta;monto_clp";
  const lineas = input.filas.map(
    (f) =>
      `${esc(f.rut)};${esc(f.nombre)};${esc(f.bancoCodigo ?? "")};${esc(f.tipoCuenta ?? "")};${esc(f.numeroCuenta)};${f.montoClp}`,
  );
  return {
    nombre: nombrePagoBanco(input.anio, input.mes, rut),
    contenido: `${[cabecera, ...lineas].join("\r\n")}\r\n`,
    filas: input.filas.length,
    errores,
    advertencias: ADVERTENCIAS(input.formatoBanco),
  };
}