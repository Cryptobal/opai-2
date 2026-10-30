import { z } from "zod";

// Secciones, líneas y aprobaciones de una versión. Sueldo, costo unitario, margen propio y el margen
// de una aprobación solo viajan con `cpq:costos.ver` (R59, R20).

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export const seccionSchema = z.object({
  id: z.string(),
  tipo: z.enum(["instalacion", "comun"]),
  instalacionId: z.string().nullable(),
  nombre: z.string(),
  orden: z.number(),
});

export const lineaSchema = z.object({
  id: z.string(),
  seccionId: z.string(),
  tipo: z.enum(["puesto", "item", "adicional"]),
  grupo: z.string().nullable(),
  nombre: z.string(),
  orden: z.number(),
  habilitada: z.boolean(),
  visibleCliente: z.boolean(),
  cantidad: z.number(),
  cargoId: z.string().nullable(),
  patronId: z.string().nullable(),
  horario: z.unknown().nullable(),
  personasPorPosicion: z.number().nullable(),
  recurrencia: z.enum(["mensual", "unico"]),
  sueldoBruto: z.number().nullable().optional(),
  costoUnitario: z.number().nullable().optional(),
  margenPropio: z.number().nullable().optional(),
  motivoPersonas: z.string().nullable().optional(),
});

export const aprobacionSchema = z.object({
  id: z.string(),
  estado: z.enum(["pendiente", "aprobada", "rechazada", "retirada"]),
  motivo: z.enum(["margen_bajo", "subvalorada"]),
  solicitadaPor: z.string().nullable(),
  decididaPor: z.string().nullable(),
  ventaMensual: z.number().nullable(),
  creadaEn: z.string(),
  decididaEn: z.string().nullable(),
  margenEfectivo: z.number().nullable().optional(),
});

type FilaSeccion = { id: string; tipo: string; instalacionId: string | null; nombre: string; orden: number };
type FilaLinea = {
  id: string;
  seccionId: string;
  tipo: string;
  grupo: string | null;
  nombre: string;
  orden: number;
  habilitada: boolean;
  visibleCliente: boolean;
  cantidad: number;
  cargoId: string | null;
  patronId: string | null;
  horario: unknown;
  personasPorPosicion: number | null;
  motivoPersonas: string | null;
  recurrencia: string;
  sueldoBruto: number | null;
  costoUnitario: number | null;
  margenPropio: number | null;
};
type FilaAprobacion = {
  id: string;
  estado: string;
  motivo: string;
  solicitadaPor: string | null;
  decididaPor: string | null;
  ventaMensual: number | null;
  margenEfectivo: number | null;
  createdAt: Date;
  decididaEn: Date | null;
};

export const vistaSeccion = (s: FilaSeccion) => ({
  id: s.id,
  tipo: seccionSchema.shape.tipo.parse(s.tipo),
  instalacionId: s.instalacionId,
  nombre: s.nombre,
  orden: s.orden,
});

export function vistaLinea(l: FilaLinea, costos: boolean) {
  return {
    id: l.id,
    seccionId: l.seccionId,
    tipo: lineaSchema.shape.tipo.parse(l.tipo),
    grupo: l.grupo,
    nombre: l.nombre,
    orden: l.orden,
    habilitada: l.habilitada,
    visibleCliente: l.visibleCliente,
    cantidad: l.cantidad,
    cargoId: l.cargoId,
    patronId: l.patronId,
    horario: l.horario ?? null,
    personasPorPosicion: l.personasPorPosicion,
    recurrencia: lineaSchema.shape.recurrencia.parse(l.recurrencia),
    ...(costos
      ? {
          sueldoBruto: l.sueldoBruto,
          costoUnitario: l.costoUnitario,
          margenPropio: l.margenPropio,
          motivoPersonas: l.motivoPersonas,
        }
      : {}),
  };
}

export function vistaAprobacion(a: FilaAprobacion, costos: boolean) {
  return {
    id: a.id,
    estado: aprobacionSchema.shape.estado.parse(a.estado),
    motivo: aprobacionSchema.shape.motivo.parse(a.motivo),
    solicitadaPor: a.solicitadaPor,
    decididaPor: a.decididaPor,
    ventaMensual: a.ventaMensual,
    creadaEn: a.createdAt.toISOString(),
    decididaEn: iso(a.decididaEn),
    ...(costos ? { margenEfectivo: a.margenEfectivo } : {}),
  };
}
