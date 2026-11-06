// Nómina de transferencias Santander (CAR-208, R3). **El formato NO está confirmado**: la extracción de
// 1.0 (R-REN-43) solo lista las 13 columnas; faltan encabezados exactos, anchos, el catálogo de
// códigos de banco y la validación del banco. Esta estructura es PROVISORIA y la capacidad que la usa
// queda detrás del ajuste `nomina_formato_confirmado` hasta que Carlos entregue la especificación o
// un archivo de ejemplo (DECISIÓN CARLOS en el PR). OPAI solo genera el archivo: no transmite nada.

import { formatearRut, rutValido } from "@opai/domain";

/** Columnas en el orden de la extracción de 1.0 (R-REN-43). «Glosas de cartola» son dos columnas. */
export const COLUMNAS_NOMINA = [
  "Cuenta origen", "Moneda origen", "Cuenta destino", "Moneda destino", "Código banco destino",
  "RUT", "Nombre", "Monto", "Glosa", "Correo", "Mensaje", "Glosa cartola origen", "Glosa cartola destino",
] as const;

/** Largos máximos PROVISORIOS (sin especificación): se ajustan con el formato confirmado. */
export const LARGOS_NOMINA = { nombre: 45, glosa: 20, mensaje: 60, correo: 60, cuenta: 20, glosaCartola: 20 } as const;

export type FilaNomina = {
  cuentaDestino: string;
  codigoBanco: string;
  rut: string;
  nombre: string;
  /** Una fila por beneficiario: suma de sus rendiciones del lote, CLP entero. */
  montoClp: number;
  correo: string | null;
};

export type ParametrosNomina = { cuentaOrigen: string; glosa: string };

/** Sin tildes, ñ ni símbolos: los archivos bancarios suelen aceptar solo ASCII (provisorio). */
export function textoPlano(t: string, max: number): string {
  return t.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

const soloDigitos = (t: string) => t.replace(/\D/g, "");

/** Errores por beneficiario (índice base 0); sin errores = archivo generable. */
export function validarFilasNomina(filas: readonly FilaNomina[], p: ParametrosNomina): string[] {
  const errores: string[] = [];
  if (!soloDigitos(p.cuentaOrigen)) errores.push("Falta la cuenta de origen de la empresa.");
  if (filas.length === 0) errores.push("El lote no tiene beneficiarios.");
  filas.forEach((f, i) => {
    const n = i + 1;
    if (!rutValido(f.rut)) errores.push(`Beneficiario ${n}: RUT inválido.`);
    const cuenta = soloDigitos(f.cuentaDestino);
    if (!cuenta || cuenta.length > LARGOS_NOMINA.cuenta) errores.push(`Beneficiario ${n}: cuenta destino inválida.`);
    if (!/^\d{3}$/.test(f.codigoBanco)) errores.push(`Beneficiario ${n}: el banco no tiene código de 3 dígitos.`);
    if (!Number.isInteger(f.montoClp) || f.montoClp <= 0) errores.push(`Beneficiario ${n}: monto inválido.`);
    if (!textoPlano(f.nombre, LARGOS_NOMINA.nombre)) errores.push(`Beneficiario ${n}: falta el nombre.`);
  });
  return errores;
}

/** Filas del archivo (matriz de celdas): CLP entero como número, texto plano recortado a los largos. */
export function filasDeNomina(filas: readonly FilaNomina[], p: ParametrosNomina): (string | number)[][] {
  return filas.map((f) => [
    soloDigitos(p.cuentaOrigen), "CLP", soloDigitos(f.cuentaDestino), "CLP", f.codigoBanco,
    formatearRut(f.rut), textoPlano(f.nombre, LARGOS_NOMINA.nombre), f.montoClp,
    textoPlano(p.glosa, LARGOS_NOMINA.glosa), (f.correo ?? "").trim().slice(0, LARGOS_NOMINA.correo), "",
    textoPlano(p.glosa, LARGOS_NOMINA.glosaCartola), textoPlano(p.glosa, LARGOS_NOMINA.glosaCartola),
  ]);
}

/** Total de la nómina: suma de los montos (debe igualar el total del lote). */
export const totalNomina = (filas: readonly { montoClp: number }[]): number => filas.reduce((s, f) => s + f.montoClp, 0);

/** Suma por beneficiario (RUT): una persona con varias rendiciones recibe una sola transferencia. */
export function agruparPorBeneficiario<T extends { rut: string; montoClp: number }>(filas: readonly T[]): T[] {
  const porRut = new Map<string, T>();
  for (const f of filas) {
    const clave = f.rut.replace(/[^0-9kK]/g, "").toUpperCase();
    const previo = porRut.get(clave);
    porRut.set(clave, previo ? { ...previo, montoClp: previo.montoClp + f.montoClp } : f);
  }
  return [...porRut.values()];
}
