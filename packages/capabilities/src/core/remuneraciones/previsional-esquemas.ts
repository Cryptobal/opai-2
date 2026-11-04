// Esquemas de los indicadores previsionales que se leen de Previred (CAR-193).
import { z } from "zod";

import { PCT_ESCALA, type DatosIndicadores, type IndicadorPrevired } from "@opai/domain";

const tasa = z.number().int().min(0).max(PCT_ESCALA);
const uf = z.number().int().min(1);

/** Cada esquema corresponde al valor completo que guarda `valores_publicados.valor_json`. */
export const ESQUEMAS_PREVIRED = {
  imm: z.number().int().min(1),
  topes: z.object({ pensionSaludUf: uf, ipsUf: uf, cesantiaUf: uf, indemnizacionUf: uf }),
  afp: z.object({
    obligatoria: tasa,
    salud: tasa,
    comisiones: z.object({
      uno: tasa, modelo: tasa, planvital: tasa, habitat: tasa, capital: tasa, cuprum: tasa, provida: tasa,
    }),
  }),
  sis: tasa,
  cesantia: z.object({ indefinidoEmpleador: tasa, plazoFijoEmpleador: tasa, indefinidoTrabajador: tasa }),
} satisfies { [K in IndicadorPrevired]: z.ZodType<DatosIndicadores[K]> };
