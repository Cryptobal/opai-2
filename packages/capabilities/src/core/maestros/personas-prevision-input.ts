// Entrada de `core.personas.prevision_actualizar` (CAR-276). Los campos de catálogo aceptan el código o el texto
// escrito a mano («AFP Habitat»), que se normaliza al código; un texto que no calza se rechaza.
import { z } from "zod";

import {
  AFPS,
  DISCAPACIDAD_INVALIDEZ,
  MONEDAS_APV,
  normalizarAfp,
  normalizarRegimen,
  normalizarSalud,
  REGIMENES_APV,
  REGIMENES_PREVISIONALES,
  SISTEMAS_SALUD,
  TIPOS_PENSION,
  TRAMOS_ASIGNACION,
  valoresDe,
} from "@opai/domain";

import { uuidSchema } from "../esquemas";
import { textoOpcional } from "./comun";

const codigo = <T extends string>(valores: [T, ...T[]], normalizar?: (t: string) => string | null) =>
  z
    .preprocess(
      (v) => (typeof v === "string" ? (v.trim() === "" ? null : (normalizar?.(v) ?? v.trim())) : v),
      z.enum(valores).nullable(),
    )
    .optional();

const decimal = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,10}([.,]\d{1,4})?$/, "Usa un número, con hasta 4 decimales.")
    .transform((s) => s.replace(",", "."))
    .refine((s) => Number(s) <= max, `No puede superar ${max}.`)
    .nullable()
    .optional();

const cargas = z.number().int().min(0).max(20).optional();

export const inputPrevision = z.object({
  id: uuidSchema,
  afp: codigo(valoresDe(AFPS), normalizarAfp),
  regimen: codigo(valoresDe(REGIMENES_PREVISIONALES), normalizarRegimen),
  sistemaSalud: codigo(valoresDe(SISTEMAS_SALUD), normalizarSalud),
  isapreNombre: textoOpcional(120),
  planIsapre: textoOpcional(500),
  planUf: z.string().trim().max(20).nullable().optional(),
  cotizacionUfPct: z.string().trim().max(20).nullable().optional(),
  jubilado: z.boolean().optional(),
  tipoPension: codigo(valoresDe(TIPOS_PENSION)),
  saludAdicionalPct: decimal(100),
  cotizaAfp: z.boolean().optional(),
  cotizaAfc: z.boolean().optional(),
  cotizaSalud: z.boolean().optional(),
  apvInstitucion: textoOpcional(80),
  apvRegimen: codigo(valoresDe(REGIMENES_APV)),
  apvMonto: decimal(1_000_000_000),
  apvMoneda: codigo(valoresDe(MONEDAS_APV)),
  tramoAsignacion: codigo(valoresDe(TRAMOS_ASIGNACION)),
  cargasSimples: cargas,
  cargasMaternales: cargas,
  cargasInvalidez: cargas,
  discapacidadInvalidez: codigo(valoresDe(DISCAPACIDAD_INVALIDEZ)),
});

export type InputPrevision = z.infer<typeof inputPrevision>;

/** Columnas que se copian tal cual del input (las que no son el plan cifrado). */
export const COLUMNAS_PREVISION = [
  "afp", "regimen", "sistemaSalud", "isapreNombre", "planUf", "cotizacionUfPct", "jubilado", "tipoPension",
  "saludAdicionalPct", "cotizaAfp", "cotizaAfc", "cotizaSalud", "apvInstitucion", "apvRegimen", "apvMonto",
  "apvMoneda", "tramoAsignacion", "cargasSimples", "cargasMaternales", "cargasInvalidez", "discapacidadInvalidez",
] as const satisfies readonly (keyof InputPrevision)[];
