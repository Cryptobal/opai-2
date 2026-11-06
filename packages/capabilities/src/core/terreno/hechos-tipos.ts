import { z } from "zod";

/**
 * Lista blanca de hechos que un equipo de terreno puede encolar sin conexión (CAR-78 · B3). Un tipo que no
 * está aquí se rechaza y el resto del lote sigue. Cada módulo de terreno (Rondas, Asistencia, Novedades,
 * Acceso) agrega los suyos, con su esquema, en su propio PR. El esquema es estricto: sin campos de más.
 */
export const TIPOS_HECHO_TERRENO = {
  /** El equipo avisa que estuvo activo. Sin datos personales; sirve para probar la cola de punta a punta. */
  "terreno.latido": z.object({ version: z.string().max(40) }).strict(),
} as const satisfies Record<string, z.ZodType>;

export type TipoHechoTerreno = keyof typeof TIPOS_HECHO_TERRENO;

export const tipoPermitido = (tipo: string): tipo is TipoHechoTerreno =>
  Object.hasOwn(TIPOS_HECHO_TERRENO, tipo);
