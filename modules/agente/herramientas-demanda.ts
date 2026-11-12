import type { Contexto, Resultado } from "@opai/capabilities";
import type { HerramientaMcp } from "@opai/capabilities/mcp";
import { z } from "zod";

import { esquemasDelAgente, herramientasDelAgente } from "./herramientas";

/**
 * El registro completo no cabe en una llamada (CAR-333: ~590 esquemas superan el tope de tokens
 * del turno). El modelo recibe un índice de nombres, pide los esquemas que necesita y ejecuta por
 * una herramienta genérica. La lista que ve el proveedor no cambia durante el turno: el adaptador
 * de Anthropic exige las mismas herramientas para continuar una respuesta.
 * Los guiones impiden chocar con una capacidad: sus nombres solo llevan letras, dígitos y «_».
 */
export const CARGAR = "cargar-herramientas";
export const USAR = "usar-herramienta";
export const MAX_CARGA = 8;
const carga = z.object({ nombres: z.array(z.string().min(1).max(120)).min(1).max(MAX_CARGA) });
const uso = z.object({
  nombre: z.string().min(1).max(120),
  argumentos: z.record(z.string(), z.unknown()).default({}),
});

export const GUIA = `Las herramientas de OPAI no vienen cargadas: abajo está el índice de sus nombres,
agrupados por módulo. Para usar una: 1) pide su esquema con ${CARGAR} (hasta ${MAX_CARGA} nombres por
vez; carga solo las que la solicitud necesita); 2) ejecútala con ${USAR}, pasando su nombre y los
argumentos según ese esquema. Sin su esquema es fácil equivocar los argumentos.`;

/** Solo nombres: sin descripciones ni esquemas, para que el índice quepa en cada llamada. */
export function indiceDelAgente(ctx: Contexto): string {
  const porModulo = new Map<string, string[]>();
  for (const h of herramientasDelAgente(ctx)) {
    const lista = porModulo.get(h.capacidad.modulo) ?? [];
    lista.push(h.nombre);
    porModulo.set(h.capacidad.modulo, lista);
  }
  return [...porModulo].map(([modulo, nombres]) => `${modulo}: ${nombres.join(", ")}`).join("\n");
}

/** Siempre las mismas dos herramientas; nunca el catálogo. */
export function esquemasADemanda() {
  return [
    {
      nombre: CARGAR,
      descripcion: "Devuelve la descripción y el esquema de las herramientas del índice que pidas.",
      esquema: z.toJSONSchema(carga, { io: "input" }),
    },
    {
      nombre: USAR,
      descripcion: "Ejecuta una herramienta ya cargada. Las escrituras solo dan una vista previa.",
      esquema: z.toJSONSchema(uso, { io: "input" }),
    },
  ];
}

const invalido = (message: string): Resultado => ({
  ok: false,
  error: { code: "INVALID_INPUT", message },
});

/** Solo se entregan esquemas de lo que el usuario ya puede usar; lo demás va como desconocido. */
function cargarHerramientas(ctx: Contexto, cargadas: Set<string>, argumentos: unknown): Resultado {
  const pedido = carga.safeParse(argumentos);
  if (!pedido.success) return invalido(`Indica de 1 a ${MAX_CARGA} nombres del índice.`);
  const pedidos = new Set(pedido.data.nombres);
  const herramientas = esquemasDelAgente(ctx).filter((e) => pedidos.has(e.nombre));
  for (const e of herramientas) cargadas.add(e.nombre);
  const desconocidas = [...pedidos].filter((n) => !cargadas.has(n));
  return { ok: true, dryRun: false, data: { herramientas, desconocidas } };
}

/** Decide qué hacer con una llamada del modelo: responder aquí o ejecutar una capacidad real. */
export function resolverLlamada(
  ctx: Contexto,
  cargadas: Set<string>,
  nombre: string,
  argumentos: unknown,
): Resultado | { h: HerramientaMcp; argumentos: unknown } {
  if (nombre === CARGAR) return cargarHerramientas(ctx, cargadas, argumentos);
  const sinPermiso: Resultado = {
    ok: false,
    error: { code: "FORBIDDEN", message: "Sin permiso." },
  };
  if (nombre !== USAR) return sinPermiso;
  const pedido = uso.safeParse(argumentos);
  if (!pedido.success) return invalido("Indica el nombre de la herramienta y sus argumentos.");
  // Sin cargarla antes igual se valida contra su esquema: un argumento malo vuelve como error.
  const h = herramientasDelAgente(ctx).find((h) => h.nombre === pedido.data.nombre);
  return h ? { h, argumentos: pedido.data.argumentos } : sinPermiso;
}
