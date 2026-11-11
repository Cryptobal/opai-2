import { CAMPOS_CONTACTO } from "./catalogo-contacto";
import { CAMPOS_CUENTA } from "./catalogo-cuenta";
import { CAMPOS_EMPRESA } from "./catalogo-empresa";
import { CAMPOS_INSTALACION } from "./catalogo-lugares";
import { CAMPOS_COTIZACION, CAMPOS_NEGOCIO } from "./catalogo-negocio";
import { CAMPOS_PERSONA } from "./catalogo-personas";
import { CAMPOS_REFERENCIA } from "./catalogo-referencias";
import type { CampoDef, ColeccionDef, FinalidadCampo } from "./tipos";

/**
 * Sube con cada campo nuevo o cambio de clave (los alias antiguos se mantienen). Lo congelado al enviar
 * guarda esta versión. v2 (CAR-138 PR 7): colección `referencias`.
 */
export const VERSION_CATALOGO_CAMPOS = 2;

/** El catálogo único. Documentos, contratos, CPQ y propuestas consumen este contrato; no hay otro local. */
export const CATALOGO_CAMPOS: readonly CampoDef[] = [
  ...CAMPOS_EMPRESA,
  ...CAMPOS_CUENTA,
  ...CAMPOS_CONTACTO,
  ...CAMPOS_PERSONA,
  ...CAMPOS_INSTALACION,
  ...CAMPOS_NEGOCIO,
  ...CAMPOS_COTIZACION,
  ...CAMPOS_REFERENCIA,
];

export const COLECCIONES_CAMPO: readonly ColeccionDef[] = [
  {
    clave: "instalaciones",
    entidad: "instalacion",
    descripcion: "Instalaciones de la cuenta incluidas en el documento",
  },
  {
    clave: "referencias",
    entidad: "referencia",
    descripcion: "Clientes activos que consintieron ser referencia (nunca la cuenta destinataria)",
  },
];

const POR_CLAVE = new Map<string, CampoDef>();
for (const c of CATALOGO_CAMPOS) {
  POR_CLAVE.set(c.clave, c);
  for (const a of c.alias ?? []) POR_CLAVE.set(a, c);
}

/** Resuelve una clave canónica o un alias antiguo. */
export function campoPorClave(clave: string): CampoDef | undefined {
  return POR_CLAVE.get(clave.toLowerCase());
}

export function coleccionPorClave(clave: string): ColeccionDef | undefined {
  return COLECCIONES_CAMPO.find((c) => c.clave === clave.toLowerCase());
}

/** Campos que un documento de esta finalidad puede usar. */
export function camposPara(finalidad: FinalidadCampo): CampoDef[] {
  return CATALOGO_CAMPOS.filter((c) => c.finalidades.includes(finalidad));
}
