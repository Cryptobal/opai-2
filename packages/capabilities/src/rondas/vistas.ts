import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { gravedadSchema, modoSchema, ordenSchema } from "./comun";

const num = (d: { toString(): string } | number | null | undefined): number | null =>
  d == null ? null : Number(d);
const dia = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora HH:MM");
export const intervaloSchema = z.object({
  cadaMin: z.number().int().min(1).max(1440),
  desde: horaSchema,
  hasta: horaSchema,
});
export const horariosSchema = z.array(z.union([horaSchema, intervaloSchema])).max(48).default([]);
export const responsablesSchema = z.object({
  modo: z.enum(["personas", "por_turno"]).default("personas"),
  personaIds: z.array(uuidSchema).max(50).default([]),
});

export const puntoSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  nombre: z.string(),
  modo: modoSchema,
  estricto: z.boolean(),
  latitud: z.number().nullable(),
  longitud: z.number().nullable(),
  radioM: z.number().nullable(),
  precisionMinM: z.number().nullable(),
  permanenciaS: z.number(),
  etiquetaQr: z.string().nullable(),
  exigeFoto: z.boolean(),
  instrucciones: z.string().nullable(),
  estado: z.enum(["activo", "archivado"]),
  creadoEn: z.string(),
});

type FilaPunto = {
  id: string;
  instalacionId: string;
  nombre: string;
  modo: string;
  estricto: boolean;
  latitud: { toString(): string } | number | null;
  longitud: { toString(): string } | number | null;
  radioM: number | null;
  precisionMinM: number | null;
  permanenciaS: number;
  etiquetaQr: string | null;
  exigeFoto: boolean;
  instrucciones: string | null;
  estado: string;
  createdAt: Date;
};

export function vistaPunto(p: FilaPunto): z.input<typeof puntoSchema> {
  return {
    id: p.id,
    instalacionId: p.instalacionId,
    nombre: p.nombre,
    modo: p.modo as z.infer<typeof modoSchema>,
    estricto: p.estricto,
    latitud: num(p.latitud),
    longitud: num(p.longitud),
    radioM: p.radioM,
    precisionMinM: p.precisionMinM,
    permanenciaS: p.permanenciaS,
    etiquetaQr: p.etiquetaQr,
    exigeFoto: p.exigeFoto,
    instrucciones: p.instrucciones,
    estado: (p.estado === "archivado" ? "archivado" : "activo") as "activo" | "archivado",
    creadoEn: p.createdAt.toISOString(),
  };
}

export const plantillaPuntoSchema = z.object({
  puntoId: z.string(),
  orden: z.number(),
  obligatorio: z.boolean(),
});

export const plantillaSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  nombre: z.string(),
  ordenModo: ordenSchema,
  tiempoMaxMin: z.number(),
  tiempoMaxTramoMin: z.number().nullable(),
  umbralIncompletaPct: z.number(),
  permiteAdhoc: z.boolean(),
  estado: z.enum(["activo", "archivado"]),
  puntos: z.array(plantillaPuntoSchema),
});

export const tipoIncidenteSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  icono: z.string().nullable(),
  gravedadDefecto: gravedadSchema,
  activo: z.boolean(),
  orden: z.number(),
});

export const programacionSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  plantillaId: z.string(),
  nombre: z.string(),
  horarios: horariosSchema,
  diasSemana: z.array(z.number().int().min(0).max(6)),
  vigenciaDesde: z.string().nullable(),
  vigenciaHasta: z.string().nullable(),
  toleranciaMin: z.number(),
  responsables: responsablesSchema,
  estado: z.enum(["activa", "pausada"]),
});

type FilaProg = {
  id: string;
  instalacionId: string;
  plantillaId: string;
  nombre: string;
  horarios: unknown;
  diasSemana: number[];
  vigenciaDesde: Date | null;
  vigenciaHasta: Date | null;
  toleranciaMin: number;
  responsables: unknown;
  estado: string;
};

export function vistaProgramacion(p: FilaProg): z.input<typeof programacionSchema> {
  const horarios = horariosSchema.safeParse(p.horarios);
  const responsables = responsablesSchema.safeParse(p.responsables);
  return {
    id: p.id,
    instalacionId: p.instalacionId,
    plantillaId: p.plantillaId,
    nombre: p.nombre,
    horarios: horarios.success ? horarios.data : [],
    diasSemana: p.diasSemana,
    vigenciaDesde: dia(p.vigenciaDesde),
    vigenciaHasta: dia(p.vigenciaHasta),
    toleranciaMin: p.toleranciaMin,
    responsables: responsables.success ? responsables.data : { modo: "personas", personaIds: [] },
    estado: (p.estado === "pausada" ? "pausada" : "activa") as "activa" | "pausada",
  };
}
