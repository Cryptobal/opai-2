import type { Contexto, Resultado } from "@opai/capabilities";
import { z } from "zod";

import { herramientasDelAgente } from "./herramientas";

/**
 * El registro completo no cabe en una llamada (CAR-333: ~590 esquemas superan el tope de tokens
 * del turno). El modelo recibe un índice de nombres y carga solo los esquemas que necesita.
 */
export const CARGAR = "cargar_herramientas";
export const MAX_CARGA = 12;
const entrada = z.object({ nombres: z.array(z.string().min(1).max(120)).min(1).max(MAX_CARGA) });

export const GUIA = `No tienes cargadas las herramientas de OPAI: abajo está el índice de sus nombres,
agrupados por módulo. Antes de usar una, pide su esquema con ${CARGAR} (hasta ${MAX_CARGA} por vez);
queda disponible en tu siguiente paso. Carga solo las que la solicitud necesita.`;

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

/** La herramienta de carga más los esquemas ya pedidos; nunca el catálogo entero. */
export function esquemasADemanda(ctx: Contexto, cargadas: ReadonlySet<string>) {
  return [
    {
      nombre: CARGAR,
      descripcion: "Carga el esquema de las herramientas del índice que vas a usar en este turno.",
      esquema: z.toJSONSchema(entrada, { io: "input" }),
    },
    ...herramientasDelAgente(ctx)
      .filter((h) => cargadas.has(h.nombre))
      .map((h) => ({
        nombre: h.nombre,
        descripcion: h.descripcion,
        esquema: z.toJSONSchema(h.input, { io: "input" }),
      })),
  ];
}

/** Solo se cargan nombres que el usuario ya puede usar; lo demás se informa como desconocido. */
export function cargarHerramientas(
  ctx: Contexto,
  cargadas: Set<string>,
  argumentos: unknown,
): Resultado {
  const pedido = entrada.safeParse(argumentos);
  if (!pedido.success)
    return {
      ok: false,
      error: { code: "INVALID_INPUT", message: "Indica los nombres a cargar." },
    };
  const disponibles = new Set(herramientasDelAgente(ctx).map((h) => h.nombre));
  const nuevas = pedido.data.nombres.filter((n) => disponibles.has(n));
  for (const n of nuevas) cargadas.add(n);
  return {
    ok: true,
    dryRun: false,
    data: {
      cargadas: nuevas,
      desconocidas: pedido.data.nombres.filter((n) => !disponibles.has(n)),
    },
  };
}
