import { z } from "zod";

import { CAMPOS_SII, REQUISITOS_FACTURAR } from "@opai/domain";

import { externo } from "../../externo";

export const facturarSchema = z.object({
  lista: z.boolean(),
  faltan: z.array(z.enum([...REQUISITOS_FACTURAR, "destinatario"])),
});

const campoSchema = z.object({
  campo: z.enum(CAMPOS_SII),
  ficha: z.string().nullable(),
  sii: externo(z.string().nullable()),
  estado: z.enum(["igual", "distinto", "vacio_ficha", "vacio_sii"]),
});

/** Salida de `core.cuentas.consultar_sii` (CAR-162; origen y fecha de la respuesta, CAR-156). */
export const consultaSiiSchema = z.object({
  estado: z.enum(["ok", "sin_inicio", "no_encontrado", "sin_respuesta", "no_configurado"]),
  mensaje: externo(z.string().nullable()),
  rut: z.string(),
  actividades: z.array(
    z.object({ codigo: z.string(), descripcion: externo(z.string()), afectaIva: z.boolean() }),
  ),
  inicioActividades: z.string().nullable(),
  campos: z.array(campoSchema),
  facturar: facturarSchema,
  /** «Lista para facturar» si se aplicaran todos los campos del SII. */
  facturarAlAplicar: facturarSchema,
  /** «cache»: respuesta guardada vigente; «sii»: se preguntó ahora; null: no hubo respuesta del SII. */
  origen: z.enum(["cache", "sii"]).nullable(),
  /** Cuándo respondió el SII lo que se muestra (ISO). */
  consultadoEn: z.string().nullable(),
});
