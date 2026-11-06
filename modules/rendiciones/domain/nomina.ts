// Nómina de transferencias Santander (CAR-208, R3). Formato confirmado por Carlos el 6-nov-2026 (DECISIÓN
// CARLOS en el PR #361), tomado de OPAI 1.0 (`export-santander/route.ts`): XLSX con hoja «Santander», fila 1
// de encabezado en negrita y congelada, una fila por beneficiario, sin anchos fijos ni relleno. OPAI solo
// genera y descarga el archivo: no transmite nada al banco. Dominio puro (sin exceljs ni base de datos).

import { formatearRut, rutValido } from "@opai/domain";

export const HOJA_NOMINA = "Santander";

/** Las 13 columnas, en este orden y con estos encabezados exactos («Codigo» va sin tilde). */
export const COLUMNAS_NOMINA = [
  "Cuenta origen", "Moneda origen", "Cuenta destino", "Moneda destino", "Codigo banco destino",
  "RUT beneficiario", "Nombre beneficiario", "Monto transferencia", "Glosa personalizada transferencia",
  "Correo beneficiario", "Mensaje correo beneficiario", "Glosa cartola originador", "Glosa cartola beneficiario",
] as const;

/** Nombre del archivo: `{códigoLote}-santander.xlsx`. */
export const nombreArchivoNomina = (codigoLote: string): string => `${codigoLote}-santander.xlsx`;

const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Códigos SBIF de 3 dígitos (lista de Carlos, 6-nov-2026). El tipo de cuenta no va en el archivo. */
const SBIF: Readonly<Record<string, string>> = {
  "chile": "001", "internacional": "009", "estado": "012", "bancoestado": "012", "scotiabank": "014",
  "bci": "016", "mach": "016", "bice": "028", "hsbc": "031", "santander": "037", "itau": "039",
  "security": "049", "falabella": "051", "ripley": "053", "consorcio": "055", "mercado pago": "299",
  "edwards citi": "504", "edwards": "504", "citi": "504", "coopeuch": "672", "tenpo": "730", "prex": "743",
};

/**
 * Código SBIF del banco de la ficha: acepta el código de 3 dígitos o el nombre («Banco de Chile», «BancoEstado»).
 * null si no se reconoce (el beneficiario queda con «falta el código SBIF»).
 */
export function codigoSbif(banco: string | null | undefined): string | null {
  const b = (banco ?? "").trim();
  if (/^\d{3}$/.test(b)) return Object.values(SBIF).includes(b) ? b : null;
  const n = sinTildes(b).replace(/^banco de /, "").replace(/^banco /, "");
  return SBIF[n] ?? SBIF[sinTildes(b)] ?? null;
}

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
  if (!soloDigitos(p.cuentaOrigen)) errores.push("Falta configurar la cuenta de origen de la nómina.");
  if (filas.length === 0) errores.push("El lote no tiene beneficiarios.");
  filas.forEach((f, i) => {
    const faltan: string[] = [];
    if (!f.rut.trim()) faltan.push("RUT");
    else if (!rutValido(f.rut)) faltan.push("RUT válido (dígito verificador)");
    if (!soloDigitos(f.cuentaDestino)) faltan.push("cuenta destino");
    if (!/^\d{3}$/.test(f.codigoBanco)) faltan.push("código SBIF del banco");
    if (!Number.isInteger(f.montoClp) || f.montoClp <= 0) faltan.push("monto mayor que cero");
    if (faltan.length > 0) errores.push(`Beneficiario ${i + 1} (${f.nombre.trim() || "sin nombre"}): falta ${faltan.join(", ")}.`);
  });
  return errores;
}

/** Filas del archivo (matriz de celdas): monto como número entero; K, L y M van vacías. */
export function filasDeNomina(filas: readonly FilaNomina[], p: ParametrosNomina): (string | number)[][] {
  return filas.map((f) => [
    soloDigitos(p.cuentaOrigen), "CLP", soloDigitos(f.cuentaDestino), "CLP", f.codigoBanco,
    formatearRut(f.rut), f.nombre.trim(), f.montoClp, p.glosa, (f.correo ?? "").trim(), "", "", "",
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
