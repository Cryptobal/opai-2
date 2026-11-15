import {
  erroresDePropio,
  evaluarPropio,
  hechosDe,
  SENTIDOS_INDICADOR,
  type DefinicionPropio,
  type Ocurrencia,
  type RangoPeriodo,
} from "@opai/domain";
import { z } from "zod";

import { hechosDeLaEmpresa } from "../core/indicadores-gestion/hechos";
import { enScope } from "../autorizacion";
import { moduloDeHecho, type HechoGestion } from "../hechos-gestion";
import type { Contexto } from "../types";

/** Prefijo del id de un indicador propio dentro de un scorecard: `propio.<uuid>`. */
export const PREFIJO_PROPIO = "propio.";
/** Cuánto hacia atrás se busca el hecho de inicio al medir el tiempo entre dos hechos. */
const DIAS_ATRAS_INICIO = 180;

const uso = z.object({
  hecho: z.string().max(80).describe("Id de un hecho disponible (ver desempeno.hechos.list)."),
  filtros: z
    .record(z.string().max(40), z.array(z.string().max(40)).min(1).max(20))
    .refine((f) => Object.keys(f).length <= 5, "Hasta 5 filtros por hecho.")
    .optional()
    .describe("Atributo del hecho → valores aceptados."),
});

export const definicionSchema = z
  .discriminatedUnion("forma", [
    uso.extend({ forma: z.literal("contar") }),
    uso.extend({ forma: z.literal("sumar"), monto: z.string().max(40).describe("Monto del hecho a sumar.") }),
    z.object({
      forma: z.literal("tiempo"),
      desde: uso,
      hasta: uso,
      unidad: z.enum(["horas", "dias"]),
    }),
    z.object({ forma: z.literal("porcentaje"), parte: uso, total: uso }),
  ])
  .describe(
    "Forma de cálculo: contar un hecho, sumar un monto, tiempo promedio entre dos hechos de la misma entidad, o porcentaje de un hecho sobre otro.",
  );

export const propioSchema = z.object({
  id: z.string(),
  indicador: z.string().describe("Id para usarlo en un scorecard (propio.<id>)."),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  sentido: z.enum(SENTIDOS_INDICADOR),
  metaSugerida: z.number(),
  unidad: z.string(),
  vigenteDesde: z.string(),
  estado: z.enum(["borrador", "publicado"]),
  archivado: z.boolean(),
  definicion: definicionSchema,
  pendiente: z
    .object({
      vigenteDesde: z.string(),
      estado: z.enum(["borrador", "publicado"]),
      sentido: z.enum(SENTIDOS_INDICADOR),
      metaSugerida: z.number(),
      unidad: z.string(),
      definicion: definicionSchema,
    })
    .nullable()
    .describe("Cambio guardado que rige más adelante (borrador o ya publicado); null si no hay."),
});
export type VistaPropio = z.infer<typeof propioSchema>;

/** Lee la definición guardada; una fila ilegible (no debería existir) se trata como inexistente. */
export function definicionDe(json: unknown): z.infer<typeof definicionSchema> | null {
  const r = definicionSchema.safeParse(json);
  return r.success ? r.data : null;
}

type Uso = z.infer<typeof uso>;
const limpio = (u: Uso) => ({ hecho: u.hecho, ...(u.filtros ? { filtros: u.filtros } : {}) });

/** Del esquema de entrada al tipo del dominio (sin claves `undefined`). */
export function aDominio(d: z.infer<typeof definicionSchema>): DefinicionPropio {
  if (d.forma === "contar") return { forma: "contar", ...limpio(d) };
  if (d.forma === "sumar") return { forma: "sumar", monto: d.monto, ...limpio(d) };
  if (d.forma === "tiempo") {
    return { forma: "tiempo", desde: limpio(d.desde), hasta: limpio(d.hasta), unidad: d.unidad };
  }
  return { forma: "porcentaje", parte: limpio(d.parte), total: limpio(d.total) };
}

/** Quien consulta puede usar el hecho: permiso del módulo dueño y, con API key, su scope. */
export const puedeUsarHecho = (ctx: Contexto, hecho: HechoGestion): boolean =>
  enScope(ctx, moduloDeHecho(hecho.id)) && ctx.autorizar(hecho.permiso);

/** Problemas de la definición para esta empresa, incluido el permiso sobre cada hecho usado. */
export function erroresPara(ctx: Contexto, def: DefinicionPropio, exigirPermiso: boolean): string[] {
  const hechos = hechosDeLaEmpresa(ctx);
  const errores = erroresDePropio(def, hechos);
  if (!exigirPermiso || errores.length > 0) return errores;
  for (const u of hechosDe(def)) {
    const hecho = hechos.get(u.hecho);
    if (hecho && !puedeUsarHecho(ctx, hecho)) {
      errores.push(`No tienes acceso al módulo de «${hecho.nombre}»: elige otro hecho.`);
    }
  }
  return errores;
}

/** Sujeto al que se atribuye el indicador: el de su primer hecho. */
export function sujetoDe(ctx: Contexto, def: DefinicionPropio): "usuario" | "persona" {
  const primero: HechoGestion | undefined = hechosDeLaEmpresa(ctx).get(hechosDe(def)[0]?.hecho ?? "");
  return primero?.sujeto === "persona" ? "persona" : "usuario";
}

/** Evalúa la definición en un rango con los hechos reales de la empresa. */
export async function medirPropio(
  ctx: Contexto,
  def: DefinicionPropio,
  rango: Pick<RangoPeriodo, "desde" | "hasta">,
): Promise<Map<string, number | null>> {
  const hechos = hechosDeLaEmpresa(ctx);
  const atras = new Date(rango.desde.getTime() - DIAS_ATRAS_INICIO * 86_400_000);
  const ocurrencias = new Map<string, readonly Ocurrencia[]>();
  for (const [i, u] of hechosDe(def).entries()) {
    const hecho = hechos.get(u.hecho);
    if (!hecho || ocurrencias.has(u.hecho)) continue;
    // El inicio de la forma «tiempo» puede haber ocurrido antes del mes medido.
    const desde = def.forma === "tiempo" && i === 0 ? atras : rango.desde;
    ocurrencias.set(u.hecho, await hecho.listar(ctx, { desde, hasta: rango.hasta }));
  }
  return evaluarPropio(def, ocurrencias);
}
