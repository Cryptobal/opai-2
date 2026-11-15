// CAR-27 · CAR-536 · Campos personalizados por empresa en las fichas (patrón «propiedades a medida»
// de HubSpot, REFERENTES-saas §4). Lógica pura: registro de fichas, tipos, clave estable y opciones.
import { PERMISOS_CORE as P } from "./permisos-catalogo";

type FichaConCampos = { modulo: string; nombre: string; ver: string; editar: string };

/**
 * Fichas que admiten campos personalizados, con su módulo y los permisos de la ficha. Solo se ofrecen
 * las de módulos activos de la empresa. Sumar una ficha: una entrada aquí, su columna y FK en
 * `core.campo_valores` (migración) y su capacidad de valores con el alcance de la ficha.
 */
export const FICHAS_CAMPO_PERSONALIZADO = {
  cuenta: { modulo: "core", nombre: "Cuentas", ver: P.cuentasRead, editar: P.cuentasManage },
  contacto: { modulo: "core", nombre: "Contactos", ver: P.cuentasRead, editar: P.cuentasManage },
  negocio: {
    modulo: "comercial",
    nombre: "Negocios",
    ver: "comercial:negocios.read",
    editar: "comercial:negocios.manage",
  },
  instalacion: {
    modulo: "core",
    nombre: "Instalaciones",
    ver: P.instalacionesRead,
    editar: P.instalacionesManage,
  },
  persona: { modulo: "core", nombre: "Personas", ver: P.personasRead, editar: P.personasManage },
} as const satisfies Record<string, FichaConCampos>;

export type EntidadCampoPersonalizado = keyof typeof FICHAS_CAMPO_PERSONALIZADO;
export const ENTIDADES_CAMPO_PERSONALIZADO = Object.keys(FICHAS_CAMPO_PERSONALIZADO) as [
  EntidadCampoPersonalizado,
  ...EntidadCampoPersonalizado[],
];

/** Fichas disponibles para la empresa: las del núcleo siempre, las de un módulo si está activo. */
export function entidadesCampoActivas(modulosActivos: readonly string[]): EntidadCampoPersonalizado[] {
  return ENTIDADES_CAMPO_PERSONALIZADO.filter((e) => {
    const { modulo } = FICHAS_CAMPO_PERSONALIZADO[e];
    return modulo === "core" || modulosActivos.includes(modulo);
  });
}

export const TIPOS_CAMPO_PERSONALIZADO = [
  "texto",
  "texto_largo",
  "numero",
  "fecha",
  "fecha_hora",
  "si_no",
  "lista",
  "radio",
  "multiple",
  "email",
  "telefono",
  "url",
  "rut",
  "usuario",
] as const;
export type TipoCampoPersonalizado = (typeof TIPOS_CAMPO_PERSONALIZADO)[number];

/** Tipos que eligen entre opciones definidas en el campo (desplegable, radio, casillas). */
export const TIPOS_CON_OPCIONES: readonly TipoCampoPersonalizado[] = ["lista", "radio", "multiple"];

export const FORMATOS_NUMERO_CAMPO = ["entero", "decimal", "moneda_clp", "porcentaje"] as const;
export type FormatoNumeroCampo = (typeof FORMATOS_NUMERO_CAMPO)[number];

export const MAX_OPCIONES_CAMPO = 50;
const MAX_CLAVE = 40;

/** Clave estable en snake_case ASCII a partir del nombre («N° de guardias» → `n_de_guardias`). */
export function claveCampoPersonalizado(etiqueta: string): string {
  const base = etiqueta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_CLAVE)
    .replace(/_+$/g, "");
  return /^[a-z]/.test(base) ? base : `campo_${base}`.slice(0, MAX_CLAVE).replace(/_+$/g, "");
}

/** Opción de un campo: lo que ve el usuario (`etiqueta`) y lo que se guarda (`valor`). */
export type OpcionCampo = { valor: string; etiqueta: string };

/**
 * Opciones limpias en el orden dado: sin vacías ni valores repetidos (sin distinguir mayúsculas).
 * Un texto suelto es una opción cuyo valor interno es la misma etiqueta (como las de CAR-27).
 */
export function normalizarOpcionesCampo(
  opciones: readonly (string | { valor?: string | undefined; etiqueta: string })[],
): OpcionCampo[] {
  const vistas = new Set<string>();
  const salida: OpcionCampo[] = [];
  for (const o of opciones) {
    const etiqueta = (typeof o === "string" ? o : o.etiqueta).trim();
    const valor = (typeof o === "string" ? "" : (o.valor ?? "")).trim() || etiqueta;
    const k = valor.toLowerCase();
    if (!etiqueta || vistas.has(k)) continue;
    vistas.add(k);
    salida.push({ valor, etiqueta });
  }
  return salida;
}
