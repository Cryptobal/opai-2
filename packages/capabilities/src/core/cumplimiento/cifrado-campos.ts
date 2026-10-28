import { createHash } from "node:crypto";

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
// Formato guardado (texto, cabe en una columna String): `enc:v2:<kid>:` + base64url(iv ‖ tag ‖
// cifrado). `kid` identifica la DEK con que se cifró (huella de 8 bytes, no revela la clave): así una
// rotación de DEK sabe qué valores faltan por recifrar y un valor con otra DEK se descarta sin
// intentar descifrarlo (§21). `enc:v1:` (sin kid) se sigue leyendo.
// El AAD liga el valor a tenant+tabla+columna: no se puede copiar a otro campo ni a otro tenant.
//
// Plan de rotación de la DEK (docs/2.0/briefs/BRIEF-07d-ley-21719.md §22): la KEK se rota sin tocar
// los datos (`rotar-kek`). Rotar la DEK de un tenant exige recifrar sus secretos y sus campos
// sensibles en una sola operación coordinada: se genera la DEK nueva, se recifra cada valor cuyo
// `kid` es el anterior y se reemplaza la fila de `claves_tenant` al final, en la misma transacción.

const PREFIJO_V1 = "enc:v1:";
const PREFIJO = "enc:v2:";
const LARGO_IV = 12;
const LARGO_TAG = 16;

/** ¿El valor ya está cifrado con este formato? Sirve para no cifrar dos veces. */
export const estaCifrado = (valor: string | null | undefined): boolean =>
  typeof valor === "string" && (valor.startsWith(PREFIJO) || valor.startsWith(PREFIJO_V1));

/** Huella pública de una DEK (identificador, no la clave): 8 bytes de SHA-256 con separador. */
export const kidDe = (dek: Buffer): string =>
  createHash("sha256")
    .update("opai:dek-id:")
    .update(dek)
    .digest()
    .subarray(0, 8)
    .toString("base64url");

/**
 * Recifra un valor guardado de la DEK vieja a la nueva (lo usa la rotación de DEK, §22). Mantiene
 * el mismo AAD (tenant+tabla+columna). Un valor ya cifrado con la nueva se devuelve igual.
 */
export function recifrarValor(
  aad: { tenantId: string; tabla: string; campo: string },
  guardado: string,
  vieja: Buffer,
  nueva: Buffer,
): string {
  const { kid, bytes } = partir(guardado);
  if (kid === kidDe(nueva)) return guardado;
  const ad = Buffer.from(`${aad.tenantId}:${aad.tabla}.${aad.campo}`);
  const claro = descifrar(
    vieja,
    {
      iv: bytes.subarray(0, LARGO_IV),
      tag: bytes.subarray(LARGO_IV, LARGO_IV + LARGO_TAG),
      cifrado: bytes.subarray(LARGO_IV + LARGO_TAG),
    },
    ad,
  );
  const c = cifrar(nueva, claro, ad);
  return `${PREFIJO}${kidDe(nueva)}:${Buffer.concat([c.iv, c.tag, c.cifrado]).toString("base64url")}`;
}

/** Separa un valor guardado en su `kid` (null en v1) y sus bytes. */
function partir(guardado: string): { kid: string | null; bytes: Buffer } {
  if (guardado.startsWith(PREFIJO_V1))
    return { kid: null, bytes: Buffer.from(guardado.slice(PREFIJO_V1.length), "base64url") };
  const resto = guardado.slice(PREFIJO.length);
  const i = resto.indexOf(":");
  if (i <= 0) throw reglaDeNegocio("Valor cifrado inválido.");
  return { kid: resto.slice(0, i), bytes: Buffer.from(resto.slice(i + 1), "base64url") };
}

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
      const dek = await clave();
      const c = cifrar(dek, Buffer.from(valor, "utf8"), aad);
      const bytes = Buffer.concat([c.iv, c.tag, c.cifrado]);
      return `${PREFIJO}${kidDe(dek)}:${bytes.toString("base64url")}`;
    },
    async descifrar(tabla, campo, guardado) {
      const aad = preparar(tabla, campo);
      if (!estaCifrado(guardado)) throw reglaDeNegocio("El valor no está cifrado.");
      const { kid, bytes } = partir(guardado);
      // Un valor vacío cifrado ocupa exactamente iv + tag: es válido (antes se rechazaba, §21).
      if (bytes.length < LARGO_IV + LARGO_TAG) throw reglaDeNegocio("Valor cifrado inválido.");
      const dek = await clave();
      if (kid !== null && kid !== kidDe(dek))
        throw reglaDeNegocio("No se pudo descifrar el valor."); // otra DEK: sin detalle, como el resto
      const iv = bytes.subarray(0, LARGO_IV);
      const tag = bytes.subarray(LARGO_IV, LARGO_IV + LARGO_TAG);
      const cifrado = bytes.subarray(LARGO_IV + LARGO_TAG);
      try {
        return descifrar(dek, { iv, tag, cifrado }, aad).toString("utf8");
      } catch {
        // Sin detalle: no revela si falló la clave, el contexto o la integridad.
        throw reglaDeNegocio("No se pudo descifrar el valor.");
      }
    },
  };
}
