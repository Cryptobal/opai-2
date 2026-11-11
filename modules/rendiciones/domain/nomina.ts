// Nómina de transferencias Santander (CAR-208, R3). Formato confirmado por Carlos el 6-nov-2026 (DECISIÓN
// CARLOS en el PR #361), tomado de OPAI 1.0 (`export-santander/route.ts`): XLSX con hoja «Santander», fila 1
// de encabezado en negrita y congelada, una fila por beneficiario, sin anchos fijos ni relleno. OPAI solo
// genera y descarga el archivo: no transmite nada al banco. Dominio puro (sin exceljs ni base de datos).

import { formatearRut, rutValido } from "@opai/domain";

export const HOJA_NOMINA = "Santander";

/** Las 13 columnas, en este orden y con estos encabezados exactos («Codigo» va sin tilde). */
export const COLUMNAS_NOMINA = [
  "Cuenta origen",
  "Moneda origen",
  "Cuenta destino",
  "Moneda destino",
  "Codigo banco destino",
  "RUT beneficiario",
  "Nombre beneficiario",
  "Monto transferencia",
  "Glosa personalizada transferencia",
  "Correo beneficiario",
  "Mensaje correo beneficiario",
  "Glosa cartola originador",
  "Glosa cartola beneficiario",
] as const;

/** Nombre del archivo: `{códigoLote}-santander.xlsx`. */
export const nombreArchivoNomina = (codigoLote: string): string => `${codigoLote}-santander.xlsx`;

/** Código SBIF del banco de la ficha: catálogo único del núcleo (CAR-244). */
export { codigoSbif } from "@opai/domain";

export type FilaNomina = {
  cuentaDestino: string;
  /** Código SBIF de 3 dígitos (nunca el código interno de la ficha). */
  codigoBanco: string;
  rut: string;
  nombre: string;
  /** Una fila por beneficiario: suma de sus rendiciones del lote, CLP entero. */
  montoClp: number;
  correo: string | null;
};

export type ParametrosNomina = { cuentaOrigen: string; glosa: string };

const soloDigitos = (t: string) => t.replace(/\D/g, "");

/** Qué le falta a cada beneficiario (mínimo de 1.0 + dígito verificador del RUT y monto > 0). Vacío = generable. */
export function validarFilasNomina(filas: readonly FilaNomina[], p: ParametrosNomina): string[] {
  const errores: string[] = [];
  if (!soloDigitos(p.cuentaOrigen))
    errores.push("Falta configurar la cuenta de origen de la nómina.");
  if (filas.length === 0) errores.push("El lote no tiene beneficiarios.");
  filas.forEach((f, i) => {
    const faltan: string[] = [];
    if (!f.rut.trim()) faltan.push("RUT");
    else if (!rutValido(f.rut)) faltan.push("RUT válido (dígito verificador)");
    if (!soloDigitos(f.cuentaDestino)) faltan.push("cuenta destino");
    if (!/^\d{3}$/.test(f.codigoBanco)) faltan.push("código SBIF del banco");
    if (!Number.isInteger(f.montoClp) || f.montoClp <= 0) faltan.push("monto mayor que cero");
    if (faltan.length > 0)
      errores.push(
        `Beneficiario ${i + 1} (${f.nombre.trim() || "sin nombre"}): falta ${faltan.join(", ")}.`,
      );
  });
  return errores;
}

/** Filas del archivo (matriz de celdas): monto como número entero; K, L y M van vacías. */
export function filasDeNomina(
  filas: readonly FilaNomina[],
  p: ParametrosNomina,
): (string | number)[][] {
  return filas.map((f) => [
    soloDigitos(p.cuentaOrigen),
    "CLP",
    soloDigitos(f.cuentaDestino),
    "CLP",
    f.codigoBanco,
    formatearRut(f.rut),
    f.nombre.trim(),
    f.montoClp,
    p.glosa,
    (f.correo ?? "").trim(),
    "",
    "",
    "",
  ]);
}

/** Total de la nómina: suma de los montos (debe igualar el total del lote). */
export const totalNomina = (filas: readonly { montoClp: number }[]): number =>
  filas.reduce((s, f) => s + f.montoClp, 0);

/** Suma por beneficiario (RUT): una persona con varias rendiciones recibe una sola transferencia. */
export function agruparPorBeneficiario<T extends { rut: string; montoClp: number }>(
  filas: readonly T[],
): T[] {
  const porRut = new Map<string, T>();
  for (const f of filas) {
    const clave = f.rut.replace(/[^0-9kK]/g, "").toUpperCase();
    const previo = porRut.get(clave);
    porRut.set(clave, previo ? { ...previo, montoClp: previo.montoClp + f.montoClp } : f);
  }
  return [...porRut.values()];
}
