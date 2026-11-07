import { z } from "zod";

import { esTipoSoloEnLinea } from "@opai/domain";

/**
 * Lista blanca de hechos que un equipo de terreno puede encolar sin conexión (CAR-78 · B3). Un tipo que no
 * está aquí se rechaza y el resto del lote sigue. Cada módulo de terreno (Rondas, Asistencia, Novedades,
 * Acceso) agrega los suyos, con su esquema, en su propio PR. El esquema es estricto: sin campos de más.
 */
export const TIPOS_HECHO_TERRENO = {
  /** El equipo avisa que estuvo activo. Sin datos personales; sirve para probar la cola de punta a punta. */
  "terreno.latido": z.object({ version: z.string().max(40) }).strict(),
  /**
   * Marca de un punto de ronda (CAR-78 · E3): el QR leído (o el punto, si es solo GPS) y la lectura GPS. El
   * servidor decide a qué punto corresponde y rechaza el QR de otra instalación. No marca presencia laboral.
   */
  "rondas.marca": z
    .object({
      codigo: z.string().min(1).max(200).optional(),
      puntoId: z.string().uuid().optional(),
      lectura: z
        .object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          precisionM: z.number().min(0).max(100_000),
        })
        .strict()
        .optional(),
    })
    .strict()
    .refine((p) => p.codigo !== undefined || p.puntoId !== undefined),
} as const satisfies Record<string, z.ZodType>;

export type TipoHechoTerreno = keyof typeof TIPOS_HECHO_TERRENO;

/** Lo que exige sesión en línea (rostro, prueba de vida, PIN) tampoco entra por la cola, aunque se declare. */
export const tipoPermitido = (tipo: string): tipo is TipoHechoTerreno =>
  Object.hasOwn(TIPOS_HECHO_TERRENO, tipo) && !esTipoSoloEnLinea(tipo);
