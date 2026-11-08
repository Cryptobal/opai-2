import { executeCapability, noEncontrado } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";
import type { z } from "zod";

import type { contextoSchema } from "./conversaciones-guardado";

type ContextoFicha = z.infer<typeof contextoSchema>;

/** Lectura de cada ficha: la misma capacidad que usa la pantalla, con su permiso y su alcance. */
export const FICHA = {
  cuenta: "core.cuentas.get",
  instalacion: "core.instalaciones.get",
  negocio: "comercial.negocios.get",
  persona: "core.personas.get",
} as const;

/**
 * «Preguntar sobre esta ficha» (R9): el contexto que manda el navegador no se acepta por su palabra.
 * Se lee la ficha con la identidad delegada de la persona; si no la ve (otra empresa, fuera de su
 * alcance, sin permiso o módulo apagado) responde «no existe», igual que una ficha inexistente.
 */
export async function revalidarContexto(delegado: Contexto, c: ContextoFicha): Promise<void> {
  const r = await executeCapability(delegado, FICHA[c.tipo], { id: c.id }, {});
  if (!r.ok) throw noEncontrado("La ficha");
}

/** Línea que orienta al modelo sobre la ficha abierta; es un dato, no una instrucción. */
export const lineaContexto = (c: ContextoFicha) =>
  `[Ficha abierta por la persona: ${c.tipo} ${c.id}. Consúltala con las herramientas de lectura si hace falta.]`;
