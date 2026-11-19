// Variables dinámicas de campos personalizados de cuenta en plantillas (CAR-421).
import type { ClasePlantilla } from "./documento-plantillas";
import { variablesDeDocumento } from "./documento-plantillas";
import { ambitoDeClase, gruposDeAmbito } from "./documento-plantillas-ambito";
import type { GrupoVariable, VariablePlantilla } from "./documento-plantillas";

export const PREFIJO_CAMPO_CUENTA = "cuenta.campo." as const;

/** Token completo para un campo personalizado de cuenta: `cuenta.campo.<clave>`. */
export const claveVariableCampoCuenta = (claveCampo: string) => `${PREFIJO_CAMPO_CUENTA}${claveCampo}`;

export const esVariableCampoCuenta = (clave: string): boolean => clave.startsWith(PREFIJO_CAMPO_CUENTA);

/** Clave interna del campo (`rubro`) o null si no es `cuenta.campo.*`. */
export const claveCampoDeVariable = (clave: string): string | null =>
  esVariableCampoCuenta(clave) ? clave.slice(PREFIJO_CAMPO_CUENTA.length) : null;

const admiteCamposCuenta = (clase: ClasePlantilla) => gruposDeAmbito(ambitoDeClase(clase)).includes("cuenta");

/** Variables de campos personalizados activos que una clase de plantilla puede usar. */
export const variablesCamposCuenta = (
  campos: readonly { clave: string; etiqueta: string }[],
): VariablePlantilla[] =>
  campos.map((c) => ({
    clave: claveVariableCampoCuenta(c.clave),
    grupo: "cuenta_campo" as GrupoVariable,
    etiqueta: c.etiqueta,
    sensible: false,
  }));

export const etiquetasCamposCuenta = (
  campos: readonly { clave: string; etiqueta: string }[],
): ReadonlyMap<string, string> => new Map(variablesCamposCuenta(campos).map((v) => [v.clave, v.etiqueta]));

/** Variables del texto que no están en el catálogo fijo ni en campos activos de cuenta (si la clase lo admite). */
export const variablesCampoCuentaDesconocidas = (
  texto: string,
  clase: ClasePlantilla,
  camposActivos: ReadonlySet<string>,
): string[] => {
  if (!admiteCamposCuenta(clase)) {
    return variablesDeDocumento(texto).filter(esVariableCampoCuenta);
  }
  return variablesDeDocumento(texto).filter((c) => {
    if (!esVariableCampoCuenta(c)) return false;
    const k = claveCampoDeVariable(c);
    return !k || !camposActivos.has(k);
  });
};