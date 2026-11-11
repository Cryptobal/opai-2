// Catálogo de bancos con su código SBIF/CMF de 3 dígitos y tipos de cuenta (CAR-244). La lista de bancos es la
// de Carlos del 6-nov-2026 (DECISIÓN CARLOS en el PR #361, nómina Santander de Rendiciones); el código es el que
// va en las nóminas de pago. La ficha de persona guarda el código en `banco_codigo`, nunca el nombre libre.

export type Banco = {
  /** Código SBIF/CMF de 3 dígitos. */
  codigo: string;
  nombre: string;
  /** Otros nombres con que se escribía a mano (para normalizar textos anteriores al selector). */
  alias?: readonly string[];
};

export const BANCOS_SBIF: readonly Banco[] = [
  { codigo: "001", nombre: "Banco de Chile", alias: ["chile"] },
  { codigo: "009", nombre: "Banco Internacional", alias: ["internacional"] },
  { codigo: "012", nombre: "BancoEstado", alias: ["estado", "banco estado"] },
  { codigo: "014", nombre: "Scotiabank" },
  {
    codigo: "016",
    nombre: "BCI (incluye MACH)",
    alias: ["bci", "mach", "banco de credito e inversiones"],
  },
  { codigo: "028", nombre: "Banco BICE", alias: ["bice"] },
  { codigo: "031", nombre: "HSBC" },
  { codigo: "037", nombre: "Santander", alias: ["banco santander", "santander chile"] },
  { codigo: "039", nombre: "Itaú", alias: ["itau", "banco itau"] },
  { codigo: "049", nombre: "Banco Security", alias: ["security"] },
  { codigo: "051", nombre: "Banco Falabella", alias: ["falabella"] },
  { codigo: "053", nombre: "Banco Ripley", alias: ["ripley"] },
  { codigo: "055", nombre: "Banco Consorcio", alias: ["consorcio"] },
  { codigo: "299", nombre: "Mercado Pago" },
  { codigo: "504", nombre: "Banco Edwards-Citi", alias: ["edwards citi", "edwards", "citi"] },
  { codigo: "672", nombre: "Coopeuch" },
  { codigo: "730", nombre: "Tenpo" },
  { codigo: "743", nombre: "Prex" },
];

/** Códigos SBIF válidos, para `z.enum` en el borde. */
export const CODIGOS_BANCO = BANCOS_SBIF.map((b) => b.codigo) as [string, ...string[]];

export const TIPOS_CUENTA_BANCARIA = [
  { valor: "corriente", etiqueta: "Cuenta corriente" },
  { valor: "vista", etiqueta: "Cuenta vista" },
  { valor: "rut", etiqueta: "Cuenta RUT" },
  { valor: "ahorro", etiqueta: "Cuenta de ahorro" },
] as const;

export type TipoCuentaBancaria = (typeof TIPOS_CUENTA_BANCARIA)[number]["valor"];
export const VALORES_TIPO_CUENTA_BANCARIA = TIPOS_CUENTA_BANCARIA.map((t) => t.valor) as [
  TipoCuentaBancaria,
  ...TipoCuentaBancaria[],
];

const clave = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const POR_NOMBRE = new Map<string, string>();
for (const b of BANCOS_SBIF) {
  for (const n of [b.nombre, ...(b.alias ?? [])]) POR_NOMBRE.set(clave(n), b.codigo);
}

/** Banco del catálogo por su código SBIF; null si no es un código conocido. */
export function bancoPorCodigo(codigo: string | null | undefined): Banco | null {
  return BANCOS_SBIF.find((b) => b.codigo === (codigo ?? "").trim()) ?? null;
}

/**
 * Código SBIF de un banco escrito como código («037») o como nombre («Banco de Chile», «BancoEstado»).
 * null si no se reconoce: ese dato queda señalado para corrección manual.
 */
export function codigoSbif(banco: string | null | undefined): string | null {
  const b = (banco ?? "").trim();
  if (/^\d{3}$/.test(b)) return bancoPorCodigo(b)?.codigo ?? null;
  const n = clave(b);
  return POR_NOMBRE.get(n) ?? POR_NOMBRE.get(n.replace(/^banco (de )?/, "")) ?? null;
}

/** Nombre del banco para mostrar: el del catálogo, o null si el código guardado no se reconoce. */
export const nombreBanco = (codigo: string | null | undefined): string | null =>
  bancoPorCodigo(codigo)?.nombre ?? null;

/** Tipo de cuenta canónico desde un texto libre anterior al selector; null si no se reconoce. */
export function tipoCuentaCanonico(tipo: string | null | undefined): TipoCuentaBancaria | null {
  const t = clave(tipo ?? "");
  if (!t) return null;
  if ((VALORES_TIPO_CUENTA_BANCARIA as readonly string[]).includes(t))
    return t as TipoCuentaBancaria;
  if (/\brut\b/.test(t)) return "rut";
  if (/corriente/.test(t)) return "corriente";
  if (/ahorro/.test(t)) return "ahorro";
  if (/vista|chequera electronica/.test(t)) return "vista";
  return null;
}

export const etiquetaTipoCuenta = (tipo: string | null | undefined): string | null =>
  TIPOS_CUENTA_BANCARIA.find((t) => t.valor === tipo)?.etiqueta ?? null;
