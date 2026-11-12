// Trae el export de OPAI 1 con la llave de solo lectura guardada en la integración «opai1» de la empresa
// (CAR-279). La llave no sale de aquí: no va a la respuesta, a la auditoría ni a los mensajes de error.
import { exigirDestinoPublico } from "@opai/integrations";
import { type DatosOpai1, lectorApiOpai1 } from "@opai/db/importar-opai1";

import { reglaDeNegocio } from "../errores";
import { definicionVisible, integracionDe } from "../integraciones/resolver";
import { leerSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

const FALTA =
  "Falta conectar OPAI 1: en Configuración › Integraciones › OPAI 1 pega la dirección del exportador y la llave de solo lectura.";

export async function leerExportDeOpai1(
  ctx: Contexto,
  leer: (url: string, key: string) => Promise<DatosOpai1> = (url, key) => lectorApiOpai1(url, { key }).leer(),
): Promise<DatosOpai1> {
  if (!(await definicionVisible(ctx, "opai1"))) throw reglaDeNegocio("Traer datos desde OPAI 1 no está habilitado para esta empresa.");
  const fila = await integracionDe(ctx, "opai1");
  if (!fila) throw reglaDeNegocio(FALTA);
  const [url, key] = await Promise.all([leerSecreto(ctx, fila.id, "url"), leerSecreto(ctx, fila.id, "api_key")]);
  if (!url?.trim() || !key?.trim()) throw reglaDeNegocio(FALTA);
  try {
    // Solo https y destinos públicos: la dirección la escribe una persona y el servidor la visita.
    await exigirDestinoPublico(url.trim(), "OPAI 1");
  } catch {
    throw reglaDeNegocio("La dirección del exportador de OPAI 1 no es válida: debe ser https y pública.");
  }
  try {
    return await leer(url.trim(), key.trim());
  } catch (error) {
    // Mensajes propios del lector (estado HTTP, cursor repetido, forma del JSON): sin llave ni filas.
    const detalle = error instanceof Error && /^(Exportador OPAI 1\.0|El exportador|La empresa de 1\.0)/.test(error.message) ? ` ${error.message}.` : "";
    throw reglaDeNegocio(`No se pudo leer OPAI 1.${detalle} Revisa la dirección y la llave en Configuración › Integraciones.`);
  }
}
