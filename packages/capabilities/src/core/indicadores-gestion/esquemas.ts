import {
  SENTIDOS_INDICADOR,
  SUJETOS_INDICADOR,
  TIPOS_INDICADOR,
  UNIDADES_INDICADOR,
} from "@opai/domain";
import { z } from "zod";

import { moduloDeIndicador, type IndicadorGestion } from "../../indicadores-gestion";

/** Parte declarativa de un indicador, tal como la ven la pantalla, la API y el MCP. */
export const indicadorSchema = z.object({
  id: z.string().describe("Identificador <modulo>.<nombre>."),
  modulo: z.string().describe("Módulo que lo publica."),
  nombre: z.string(),
  descripcion: z.string().describe("Qué mide, en lenguaje de negocio."),
  tipo: z.enum(TIPOS_INDICADOR),
  unidad: z.enum(UNIDADES_INDICADOR),
  sentido: z.enum(SENTIDOS_INDICADOR).describe("mayor: más es mejor. menor: menos es mejor."),
  sujeto: z
    .enum(SUJETOS_INDICADOR)
    .describe("A quién se atribuye: al usuario que actúa o a la Persona (ficha laboral)."),
  metaSugerida: z.number().describe("Meta sugerida en la unidad del indicador."),
  origen: z.string().describe("Hechos de los que sale."),
});

export function describirIndicador(i: IndicadorGestion): z.output<typeof indicadorSchema> {
  return {
    id: i.id,
    modulo: moduloDeIndicador(i.id),
    nombre: i.nombre,
    descripcion: i.descripcion,
    tipo: i.tipo,
    unidad: i.unidad,
    sentido: i.sentido,
    sujeto: i.sujeto,
    metaSugerida: i.metaSugerida,
    origen: i.origen,
  };
}
