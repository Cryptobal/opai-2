import { versionVigente } from "@opai/domain";
import { z } from "zod";

import { hechosDeLaEmpresa } from "../core/indicadores-gestion/hechos";
import { defineCapability } from "../define";
import { moduloDeHecho } from "../hechos-gestion";
import type { Contexto } from "../types";
import { mesesDe, PERMISOS_DESEMPENO } from "./comun";
import {
  definicionDe,
  PREFIJO_PROPIO,
  propioSchema,
  puedeUsarHecho,
  type VistaPropio,
} from "./propios-comun";

export const hechosList = defineCapability({
  id: "desempeno.hechos.list",
  descripcion:
    "Hechos que la empresa puede usar para armar indicadores propios: lo que OPAI ya registra (un negocio ganado, una solicitud atendida, una tarea completada), a quién se atribuye cada uno, qué montos se pueden sumar y por qué atributos se puede filtrar. Lo que no aparece aquí no se puede medir.",
  permiso: PERMISOS_DESEMPENO.scorecardsRead,
  input: z.object({}),
  output: z.array(
    z.object({
      id: z.string(),
      modulo: z.string(),
      nombre: z.string(),
      descripcion: z.string(),
      sujeto: z.string(),
      entidad: z.string().describe("Dos hechos solo se combinan en tiempo si son de la misma entidad."),
      montos: z.array(z.object({ id: z.string(), unidad: z.string() })),
      atributos: z.array(z.object({ id: z.string(), valores: z.array(z.string()) })),
      puedeUsar: z.boolean().describe("true si quien consulta tiene el permiso del módulo dueño."),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  // Lista en memoria (manifiestos registrados): no toca la base ni revela datos de personas.
  sinDb: true,
  handler: async (ctx) =>
    [...hechosDeLaEmpresa(ctx).values()].map((h) => ({
      id: h.id,
      modulo: moduloDeHecho(h.id),
      nombre: h.nombre,
      descripcion: h.descripcion,
      sujeto: h.sujeto,
      entidad: h.entidad,
      montos: h.montos.map((m) => ({ ...m })),
      atributos: h.atributos.map((a) => ({ id: a.id, valores: [...a.valores] })),
      puedeUsar: puedeUsarHecho(ctx, h),
    })),
});

/** Indicadores propios con la versión que rige en `periodo` o, si no hay, la más reciente. */
export async function propiosDe(ctx: Contexto, periodo: string): Promise<VistaPropio[]> {
  const filas = await ctx.db.desempenoIndicadorPropio.findMany({
    include: { versiones: true },
    orderBy: { nombre: "asc" },
  });
  return filas.flatMap((f): VistaPropio[] => {
    const version =
      versionVigente(f.versiones, periodo) ??
      [...f.versiones].sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? 1 : -1))[0];
    const definicion = version ? definicionDe(version.definicion) : null;
    if (!version || !definicion) return [];
    const despues = f.versiones
      .filter((v) => v.vigenteDesde > version.vigenteDesde)
      .sort((x, y) => (x.vigenteDesde < y.vigenteDesde ? 1 : -1))[0];
    const defDespues = despues ? definicionDe(despues.definicion) : null;
    const pendiente =
      despues && defDespues
        ? {
            vigenteDesde: despues.vigenteDesde,
            estado: despues.estado === "publicado" ? ("publicado" as const) : ("borrador" as const),
            sentido: despues.sentido === "menor" ? ("menor" as const) : ("mayor" as const),
            metaSugerida: Number(despues.metaSugerida),
            unidad: despues.unidad,
            definicion: defDespues,
          }
        : null;
    return [
      {
        id: f.id,
        indicador: `${PREFIJO_PROPIO}${f.id}`,
        nombre: f.nombre,
        descripcion: f.descripcion,
        sentido: version.sentido === "menor" ? "menor" : "mayor",
        metaSugerida: Number(version.metaSugerida),
        unidad: version.unidad,
        vigenteDesde: version.vigenteDesde,
        estado: version.estado === "publicado" ? "publicado" : "borrador",
        archivado: f.archivadoEn !== null,
        definicion,
        pendiente,
      },
    ];
  });
}

export const propiosList = defineCapability({
  id: "desempeno.propios.list",
  descripcion:
    "Indicadores propios de la empresa: los que armó sobre hechos registrados y que el catálogo no trae, con su forma de cálculo, unidad, meta sugerida y si están publicados. Un indicador publicado se usa en un scorecard con su id `propio.<id>`.",
  permiso: PERMISOS_DESEMPENO.scorecardsRead,
  input: z.object({ incluirArchivados: z.boolean().default(false) }),
  output: z.array(propioSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const propios = await propiosDe(ctx, (await mesesDe(ctx)).actual);
    return input.incluirArchivados ? propios : propios.filter((p) => !p.archivado);
  },
});
