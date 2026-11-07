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
  /**
   * Entrada a una instalación (portería, CAR-78 · E4b-2). Del documento solo se guardan su huella y su máscara:
   * el número completo no se persiste (decisión de Carlos, 7-nov-2026). El servidor cruza con las listas.
   */
  "acceso.entrada": z
    .object({
      tipoRegistro: z.enum(["visita", "contratista", "proveedor", "vehiculo", "despacho"]),
      documento: z
        .object({
          tipo: z.enum(["run", "pasaporte", "otro"]),
          numero: z.string().min(1).max(40),
          pais: z.string().min(2).max(3).optional(),
        })
        .strict(),
      nombre: z.string().trim().min(2).max(120),
      empresa: z.string().trim().min(1).max(120).optional(),
      motivo: z.string().trim().min(1).max(200).optional(),
      patente: z.string().min(1).max(12).optional(),
    })
    .strict(),
  /** Salida de una entrada ya registrada: apunta a la clave del hecho `acceso.entrada`. */
  "acceso.salida": z.object({ entradaClave: z.string().uuid() }).strict(),
} as const satisfies Record<string, z.ZodType>;

export type TipoHechoTerreno = keyof typeof TIPOS_HECHO_TERRENO;

/** Lo que exige sesión en línea (rostro, prueba de vida, PIN) tampoco entra por la cola, aunque se declare. */
export const tipoPermitido = (tipo: string): tipo is TipoHechoTerreno =>
  Object.hasOwn(TIPOS_HECHO_TERRENO, tipo) && !esTipoSoloEnLinea(tipo);
