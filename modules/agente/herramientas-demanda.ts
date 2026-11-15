import type { Contexto, Resultado } from "@opai/capabilities";
import type { HerramientaMcp } from "@opai/capabilities/mcp";
import { z } from "zod";

import { esquemasDelAgente, herramientasDelAgente } from "./herramientas";

/**
 * El registro completo no cabe en una llamada (CAR-333: esquemas bajo demanda; CAR-543: índice por
 * módulo con listar-modulo). El modelo pide nombres, esquemas y ejecuta por
 * una herramienta genérica. La lista que ve el proveedor no cambia durante el turno: el adaptador
 * de Anthropic exige las mismas herramientas para continuar una respuesta.
 * Los guiones impiden chocar con una capacidad: sus nombres solo llevan letras, dígitos y «_».
 */
export const LISTAR = "listar-modulo";
export const CARGAR = "cargar-herramientas";
export const USAR = "usar-herramienta";
const MAX_LOTE = 8;
const carga = z.object({ nombres: z.array(z.string().min(1).max(120)).min(1).max(MAX_LOTE) });
const listado = z.object({ modulos: z.array(z.string().min(1).max(80)).min(1).max(MAX_LOTE) });
const uso = z.object({
  nombre: z.string().min(1).max(120),
  argumentos: z.record(z.string(), z.unknown()).default({}),
});

export const GUIA = `Las herramientas de OPAI no vienen cargadas. Abajo hay un índice de módulos (solo
nombre y cantidad). Para usar una: 1) pide los nombres con ${LISTAR} (hasta ${MAX_LOTE} módulos);
2) pide el esquema con ${CARGAR} (hasta ${MAX_LOTE} nombres); 3) ejecútala con ${USAR}. Sin el
esquema es fácil equivocar los argumentos.`;

/** Índice corto por módulo; los nombres de herramientas se piden con ${LISTAR}. */
export function textoIndiceModulos(porModulo: Map<string, number>): string {
  return [...porModulo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modulo, n]) => `${modulo} (${n})`)
    .join("\n");
}

export function indiceDelAgente(ctx: Contexto): string {
  const porModulo = new Map<string, number>();
  for (const h of herramientasDelAgente(ctx)) {
    porModulo.set(h.capacidad.modulo, (porModulo.get(h.capacidad.modulo) ?? 0) + 1);
  }
  return textoIndiceModulos(porModulo);
}

function nombresPorModulo(ctx: Contexto): Map<string, string[]> {
  const porModulo = new Map<string, string[]>();
  for (const h of herramientasDelAgente(ctx)) {
    const lista = porModulo.get(h.capacidad.modulo) ?? [];
    lista.push(h.nombre);
    porModulo.set(h.capacidad.modulo, lista);
  }
  return porModulo;
}

/** Siempre las mismas tres herramientas meta; nunca el catálogo completo. */
export function esquemasADemanda() {
  return [
    {
      nombre: LISTAR,
      descripcion: "Lista los nombres de herramientas de los módulos que indiques.",
      esquema: z.toJSONSchema(listado, { io: "input" }),
    },
    {
      nombre: CARGAR,
      descripcion: "Devuelve la descripción y el esquema de las herramientas que pidas por nombre.",
      esquema: z.toJSONSchema(carga, { io: "input" }),
    },
    {
      nombre: USAR,
      descripcion: "Ejecuta una herramienta. Las escrituras solo dan una vista previa.",
      esquema: z.toJSONSchema(uso, { io: "input" }),
    },
  ];
}

const invalido = (message: string): Resultado => ({
  ok: false,
  error: { code: "INVALID_INPUT", message },
});

function listarModulos(ctx: Contexto, argumentos: unknown): Resultado {
  const pedido = listado.safeParse(argumentos);
  if (!pedido.success) return invalido(`Indica de 1 a ${MAX_LOTE} módulos del índice.`);
  const mapa = nombresPorModulo(ctx);
  const modulos: Record<string, string[]> = {};
  const desconocidos: string[] = [];
  for (const modulo of pedido.data.modulos) {
    const nombres = mapa.get(modulo);
    if (nombres) modulos[modulo] = nombres;
    else desconocidos.push(modulo);
  }
  return { ok: true, dryRun: false, data: { modulos, desconocidos } };
}

/** Solo se entregan esquemas de lo que el usuario ya puede usar; lo demás va como desconocido. */
function cargarHerramientas(ctx: Contexto, cargadas: Set<string>, argumentos: unknown): Resultado {
  const pedido = carga.safeParse(argumentos);
  if (!pedido.success) return invalido(`Indica de 1 a ${MAX_LOTE} nombres de herramienta.`);
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
  if (nombre === LISTAR) return listarModulos(ctx, argumentos);
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
