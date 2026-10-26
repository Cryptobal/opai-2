import { camposACifrar, type DatoPersonalDeclarado } from "@opai/domain";
import { cifrar, descifrar } from "@opai/integrations";

import { reglaDeNegocio } from "../../errores";
import { dekDe } from "../../integraciones/secretos";
import type { Contexto } from "../../types";
import { listarInventario } from "./inventario";

// Cifrado de aplicación de los campos sensibles del inventario (Ley 21.719, Brief 07d §4.6, §16.4:
// salud y biometría). Reusa el almacén cifrado del tenant (ADR-027): la DEK del tenant, cifrada con
// la KEK de plataforma (`OPAI_SECRETS_KEY`, la misma variable de los secretos; no hay una nueva). Por
// eso `rotar-kek` rota estos datos sin recifrarlos. El RUT queda como está (operar y buscar).
//
// Formato guardado (texto, cabe en una columna String): `enc:v1:` + base64url(iv ‖ tag ‖ cifrado).
// El AAD liga el valor a tenant+tabla+columna: no se puede copiar a otro campo ni a otro tenant.

const PREFIJO = "enc:v1:";
const LARGO_IV = 12;
const LARGO_TAG = 16;

/** ¿El valor ya está cifrado con este formato? Sirve para no cifrar dos veces. */
export const estaCifrado = (valor: string | null | undefined): boolean =>
  typeof valor === "string" && valor.startsWith(PREFIJO);

export type CifradoDeCampos = {
  cifrar(tabla: string, campo: string, valor: string): Promise<string>;
  descifrar(tabla: string, campo: string, guardado: string): Promise<string>;
};

/**
 * Cifrador de los campos que el inventario declara sensibles. Cifrar o descifrar un campo que NO
 * está declarado como sensible es un error: la regla vive en el inventario, no en cada módulo.
 */
export const cifradoDeCampos = (ctx: Contexto): CifradoDeCampos =>
  crearCifradoDeCampos(ctx, listarInventario());

/** Variante con inventario explícito, solo para pruebas: el código de negocio usa `cifradoDeCampos`. */
export function crearCifradoDeCampos(
  ctx: Contexto,
  inventario: readonly DatoPersonalDeclarado[],
): CifradoDeCampos {
  const sensibles = new Set(camposACifrar(inventario).map((c) => `${c.tabla}.${c.campo}`));
  let dek: Promise<Buffer> | null = null;
  const clave = () => (dek ??= dekDe(ctx));
  const preparar = (tabla: string, campo: string) => {
    if (!sensibles.has(`${tabla}.${campo}`))
      throw reglaDeNegocio(`${tabla}.${campo} no está declarado como sensible en el inventario.`);
    return Buffer.from(`${ctx.tenantId}:${tabla}.${campo}`);
  };
  return {
    async cifrar(tabla, campo, valor) {
      const aad = preparar(tabla, campo);
      if (estaCifrado(valor)) throw reglaDeNegocio("El valor ya está cifrado.");
      const c = cifrar(await clave(), Buffer.from(valor, "utf8"), aad);
      const bytes = Buffer.concat([c.iv, c.tag, c.cifrado]);
      return PREFIJO + bytes.toString("base64url");
    },
    async descifrar(tabla, campo, guardado) {
      const aad = preparar(tabla, campo);
      if (!estaCifrado(guardado)) throw reglaDeNegocio("El valor no está cifrado.");
      const bytes = Buffer.from(guardado.slice(PREFIJO.length), "base64url");
      if (bytes.length <= LARGO_IV + LARGO_TAG) throw reglaDeNegocio("Valor cifrado inválido.");
      const iv = bytes.subarray(0, LARGO_IV);
      const tag = bytes.subarray(LARGO_IV, LARGO_IV + LARGO_TAG);
      const cifrado = bytes.subarray(LARGO_IV + LARGO_TAG);
      try {
        return descifrar(await clave(), { iv, tag, cifrado }, aad).toString("utf8");
      } catch {
        // Sin detalle: no revela si falló la clave, el contexto o la integridad.
        throw reglaDeNegocio("No se pudo descifrar el valor.");
      }
    },
  };
}
