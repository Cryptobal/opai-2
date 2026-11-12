import { esPeriodoMensual, logroDeMeta, PERMISOS_CORE, rangoDelPeriodo } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { hoyEn, zonaDelTenant } from "../turnos/comun";
import { catalogoPara } from "./comun";
import { describirIndicador, indicadorSchema } from "./esquemas";

/** Tope de sujetos por respuesta: acota la salida y el registro de la lectura. */
const MAX_SUJETOS = 200;

const entrada = z.object({
  indicador: z.string().min(3).describe("Id del indicador, tal como viene en el catálogo."),
  periodo: z
    .string()
    .refine(esPeriodoMensual, "Usa aaaa-mm.")
    .optional()
    .describe("Mes a medir (aaaa-mm) en la zona horaria de la empresa. Por defecto, el mes en curso."),
  sujetos: z
    .array(uuidSchema)
    .min(1)
    .max(MAX_SUJETOS)
    .optional()
    .describe("Usuarios o Personas a medir, según el sujeto del indicador. Por defecto, todos los que tienen hechos en el mes."),
  meta: z
    .number()
    .positive()
    .optional()
    .describe("Meta contra la que se calcula el logro. Por defecto, la meta sugerida del indicador."),
  despuesDe: uuidSchema
    .optional()
    .describe("Para seguir una respuesta paginada: el valor `siguiente` de la página anterior."),
});

/**
 * Quien tiene alcance por filas (supervisor, ADR-022) no ve la gestión de toda la empresa: solo puede
 * medirse a sí mismo, y solo en indicadores que se atribuyen al usuario. La jefatura por cargo, que
 * abrirá el equipo a cargo, llega con CAR-314.
 */
function sujetosPermitidos(
  ctx: Contexto,
  sujeto: string,
  pedidos: readonly string[] | undefined,
): readonly string[] | undefined {
  if (ctx.alcance === null) return pedidos;
  const yo = ctx.usuario?.id;
  if (sujeto !== "usuario" || !yo || (pedidos && pedidos.some((id) => id !== yo))) {
    throw prohibido("Con tu alcance solo puedes medir tus propios indicadores.");
  }
  return [yo];
}

export const indicadoresGestionMedir = defineCapability({
  id: "core.indicadores_gestion.medir",
  descripcion:
    "Mide un indicador de gestión del catálogo en un mes: devuelve, por cada usuario o Persona con hechos en ese mes, su valor y el logro contra la meta (1 = meta cumplida, con tope 1,2). El valor sale solo de hechos ya registrados en OPAI; nadie lo digita. Sin hechos no hay fila, que no es lo mismo que un cero. Entrega hasta 200 sujetos por respuesta; si hay más, `siguiente` trae desde dónde seguir.",
  permiso: PERMISOS_CORE.indicadoresGestionRead,
  input: entrada,
  output: z.object({
    indicador: indicadorSchema,
    periodo: z.string(),
    desde: z.string().describe("Inicio del mes (inclusive), ISO 8601."),
    hasta: z.string().describe("Inicio del mes siguiente (exclusivo), ISO 8601."),
    meta: z.number(),
    mediciones: z.array(
      z.object({
        sujetoId: z.string(),
        valor: z.number().nullable().describe("null = sin hechos que medir."),
        logro: z.number().nullable().describe("Valor contra la meta; null si no hay valor."),
      }),
    ),
    siguiente: z
      .string()
      .nullable()
      .describe("Si no es null hay más sujetos: repite la consulta con este valor en `despuesDe`."),
  }),
  efecto: "lectura",
  dryRun: false,
  // Revela el resultado de gestión de cada sujeto de la página: se auditan sus ids, nunca los valores.
  auditarLectura: (salida) => salida.mediciones.map((m) => m.sujetoId),
  async handler(ctx, input) {
    const indicador = catalogoPara(ctx).find((i) => i.id === input.indicador);
    // Un indicador de un módulo apagado o fuera de scope no existe para este actor.
    if (!indicador) throw noEncontrado("El indicador");
    if (!ctx.autorizar(indicador.permiso)) {
      throw prohibido(`Para medir "${indicador.nombre}" falta el permiso ${indicador.permiso}.`);
    }
    const sujetos = sujetosPermitidos(ctx, indicador.sujeto, input.sujetos);
    const zona = await zonaDelTenant(ctx);
    const rango = rangoDelPeriodo(input.periodo ?? hoyEn(zona).slice(0, 7), zona);
    const meta = input.meta ?? indicador.metaSugerida;
    if (indicador.unidad === "porcentaje" && meta > 100) {
      throw reglaDeNegocio(`"${indicador.nombre}" es un porcentaje: la meta no puede pasar de 100.`);
    }
    const filas = await indicador.medir(ctx, {
      rango,
      zona,
      ahora: new Date(),
      ...(sujetos ? { sujetos } : {}),
    });
    const pedidos = sujetos ? new Set(sujetos) : null;
    const desde = input.despuesDe;
    const orden = filas
      // Defensa en profundidad: aunque un indicador ignore el filtro, no sale nadie no pedido.
      .filter((f) => (!pedidos || pedidos.has(f.sujetoId)) && (!desde || f.sujetoId > desde))
      .sort((a, b) => (a.sujetoId < b.sujetoId ? -1 : a.sujetoId > b.sujetoId ? 1 : 0));
    const pagina = orden.slice(0, MAX_SUJETOS);
    return {
      indicador: describirIndicador(indicador),
      periodo: rango.periodo,
      desde: rango.desde.toISOString(),
      hasta: rango.hasta.toISOString(),
      meta,
      mediciones: pagina.map((f) => ({
        sujetoId: f.sujetoId,
        valor: f.valor,
        logro: logroDeMeta(f.valor, meta, indicador.sentido),
      })),
      siguiente: orden.length > MAX_SUJETOS ? (pagina.at(-1)?.sujetoId ?? null) : null,
    };
  },
});
