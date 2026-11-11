import { limpiarKeySimpleApi } from "./simpleapi-contrato";

/**
 * Formato de la API key de SimpleAPI tal como la muestra su panel: cinco grupos de 4 caracteres separados por guiones
 * (24 en total). Guardada sin guiones (20 caracteres), SimpleAPI responde 401 «API KEY Incorrecta»; fue la causa raíz
 * del 401 de emisión del 10-nov-2026 (CAR-240, adenda de ADR-088).
 */
export const FORMATO_KEY_SIMPLEAPI = "XXXX-XXXX-XXXX-XXXX-XXXX" as const;

export const MENSAJE_KEY_SIMPLEAPI_SIN_GUIONES =
  `La API key de SimpleAPI va con guiones (24 caracteres): ${FORMATO_KEY_SIMPLEAPI}. ` +
  "Cópiala tal como aparece en el panel de SimpleAPI; no se guardó.";

/** Verdadero si la key son 20 letras o números sin guiones: la forma que SimpleAPI rechaza. */
export function keySimpleApiSinGuiones(valor: string): boolean {
  return /^[A-Za-z0-9]{20}$/.test(limpiarKeySimpleApi(valor));
}

/** Proveedores del catálogo cuya `api_key` es una key de SimpleAPI. */
const PROVEEDORES_SIMPLEAPI = new Set(["dte_emision"]);

/**
 * Motivo por el que una credencial no se debe guardar, o `null` si no hay reparo conocido. Solo revisa formas que se
 * sabe que el proveedor rechaza; nunca devuelve ni registra el valor.
 */
export function motivoSecretoInvalido(proveedor: string, nombre: string, valor: string): string | null {
  if (PROVEEDORES_SIMPLEAPI.has(proveedor) && nombre === "api_key" && keySimpleApiSinGuiones(valor)) {
    return MENSAJE_KEY_SIMPLEAPI_SIN_GUIONES;
  }
  return null;
}
