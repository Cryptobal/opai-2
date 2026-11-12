import { z } from "zod";

import { externo } from "../externo";
import { CANALES_SOLICITUD } from "./solicitudes-dominio";
import { resumenPlazoSchema } from "./solicitudes-plazo";

const clp = z.number().int().describe("CLP enteros, valor mensual.");
const pct = z.number().int().nullable().describe("Entero 0–100; null si no hay datos para calcularlo.");
const rango = z.object({ desde: z.string(), hasta: z.string() });
const cierre = z.object({
  ganados: z.number().int(),
  perdidos: z.number().int(),
  montoGanadoMensualClp: clp,
  montoPerdidoMensualClp: clp,
  conversionPct: pct.describe("Ganados sobre cerrados del rango, 0–100; null sin cerrados."),
  cicloPromedioDias: z.number().int().nullable().describe("Días de creación a ganado; null sin ganados."),
});

export const PERIODOS = ["mes", "trimestre", "anio"] as const;

export const entradaTablero = z.object({
  periodo: z.enum(PERIODOS).default("mes").describe("Mes, trimestre o año calendario en curso."),
  responsableId: z.uuid().optional().describe("Solo los negocios y solicitudes de ese responsable."),
});

export const salidaTablero = z.object({
  periodo: z.enum(PERIODOS),
  ...rango.shape,
  anterior: rango,
  enCurso: z.object({ cantidad: z.number().int(), montoMensualClp: clp }),
  cierre,
  cierreAnterior: cierre,
  embudo: z.array(
    z.object({
      etapaId: z.string(),
      nombre: externo(z.string()),
      cantidad: z.number().int(),
      montoMensualClp: clp,
      diasPromedio: z.number().int().nullable().describe("Días promedio en la etapa, últimos 12 meses."),
      avanzaPct: pct.describe("Salidas de la etapa hacia una posterior o a ganado, últimos 12 meses."),
    }),
  ),
  perdidas: z.object({
    desde: z.string().describe("Los motivos cubren los últimos 12 meses."),
    motivos: z.array(z.object({ motivoId: z.string().nullable(), nombre: externo(z.string()), cantidad: z.number().int() })),
    competidores: z.array(z.object({ nombre: externo(z.string()), cantidad: z.number().int() })),
  }),
  canales: z
    .array(
      z.object({
        canal: z.enum(CANALES_SOLICITUD),
        solicitudes: z.number().int(),
        negocios: z.number().int(),
        ganados: z.number().int(),
        montoGanadoMensualClp: clp,
        conversionPct: z.number().int().describe("Solicitudes del período que llegaron a negocio, 0–100."),
      }),
    )
    .nullable()
    .describe("Solicitudes recibidas en el período, por canal. null si el actor no puede leer solicitudes."),
  primeraRespuesta: resumenPlazoSchema
    .nullable()
    .describe("Primera respuesta a solicitudes del período. null si la empresa no fijó tiempo objetivo o el actor no lee solicitudes."),
  pronostico: z.object({
    totalPonderadoClp: clp.describe("Suma de monto mensual por probabilidad de todos los abiertos."),
    meses: z.array(z.object({ mes: z.string().describe("aaaa-mm"), montoMensualClp: clp, ponderadoClp: clp })),
    fueraDeRango: z
      .object({ cantidad: z.number().int(), ponderadoClp: clp })
      .describe("Abiertos sin fecha de cierre estimada, vencida o posterior a los meses mostrados."),
  }),
  responsables: z.array(
    z.object({
      responsableId: z.string().nullable(),
      nombre: externo(z.string()),
      abiertos: z.number().int(),
      enCursoMensualClp: clp,
      ponderadoClp: clp,
      ganados: z.number().int(),
      perdidos: z.number().int(),
      conversionPct: pct,
    }),
  ),
});
