import { CAMPOS_CONTACTO } from "./catalogo-contacto";
import { CAMPOS_CUENTA } from "./catalogo-cuenta";
import { CAMPOS_EMPRESA } from "./catalogo-empresa";
import { CAMPOS_INSTALACION } from "./catalogo-lugares";
import { CAMPOS_COTIZACION, CAMPOS_NEGOCIO } from "./catalogo-negocio";
import { CAMPOS_PERSONA } from "./catalogo-personas";
import type { CampoDef, ColeccionDef, FinalidadCampo } from "./tipos";

/** Sube cuando cambia el contrato de forma incompatible. Lo congelado al enviar guarda esta versión. */
export const VERSION_CATALOGO_CAMPOS = 1;

/** El catálogo único. Documentos, contratos, CPQ y propuestas consumen este contrato; no hay otro local. */
export const CATALOGO_CAMPOS: readonly CampoDef[] = [
  ...CAMPOS_EMPRESA,
  ...CAMPOS_CUENTA,
  ...CAMPOS_CONTACTO,
  ...CAMPOS_PERSONA,
  ...CAMPOS_INSTALACION,
  ...CAMPOS_NEGOCIO,
  ...CAMPOS_COTIZACION,
];

export const COLECCIONES_CAMPO: readonly ColeccionDef[] = [
  {
    clave: "instalaciones",
    entidad: "instalacion",
    descripcion: "Instalaciones de la cuenta incluidas en el documento",
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
