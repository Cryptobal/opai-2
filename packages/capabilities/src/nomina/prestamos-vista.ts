import { z } from "zod";

import { ESTADOS_CUOTA, ESTADOS_PRESTAMO, saldoPrestamo } from "@opai/domain";

export const cuotaSchema = z.object({
  id: z.string(),
  numero: z.number().int(),
  anio: z.number().int(),
  mes: z.number().int(),
  monto: z.number().int(),
  estado: z.enum(ESTADOS_CUOTA),
});

export const prestamoSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  personaNombre: z.string(),
  montoTotal: z.number().int(),
  cuotas: z.number().int(),
  primeraCuotaAnio: z.number().int(),
  primeraCuotaMes: z.number().int(),
  estado: z.enum(ESTADOS_PRESTAMO),
  motivo: z.string().nullable(),
  documentoId: z.string().nullable(),
  saldo: z.number().int().describe("Suma de las cuotas aún pendientes."),
  plan: z.array(cuotaSchema),
});

type CuotaFila = { id: string; numero: number; anio: number; mes: number; monto: number; estado: string };
type PrestamoFila = {
  id: string;
  personaId: string;
  montoTotal: number;
  cuotas: number;
  primeraCuotaAnio: number;
  primeraCuotaMes: number;
  estado: string;
  motivo: string | null;
  documentoId: string | null;
};

export function vistaPrestamo(p: PrestamoFila, plan: readonly CuotaFila[], nombre: string) {
  const cuotas = [...plan].sort((a, b) => a.numero - b.numero).map((c) => ({
    id: c.id,
    numero: c.numero,
    anio: c.anio,
    mes: c.mes,
    monto: c.monto,
    estado: c.estado as "pendiente" | "descontada" | "condonada",
  }));
  return {
    id: p.id,
    personaId: p.personaId,
    personaNombre: nombre,
    montoTotal: p.montoTotal,
    cuotas: p.cuotas,
    primeraCuotaAnio: p.primeraCuotaAnio,
    primeraCuotaMes: p.primeraCuotaMes,
    estado: p.estado as "activo" | "pagado" | "cancelado",
    motivo: p.motivo ?? null,
    documentoId: p.documentoId ?? null,
    saldo: saldoPrestamo(cuotas),
    plan: cuotas,
  };
}
