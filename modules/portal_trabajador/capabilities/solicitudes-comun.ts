import { z } from "zod";

import type { Contexto } from "@opai/capabilities";

/** Lo que el trabajador puede pedir desde su portal (CAR-464). Licencias y ausencias las registra RR. HH. */
export const TIPOS_SOLICITUD = ["permiso", "vacaciones"] as const;

const DIAS_MAX = 60;
const DIA_MS = 86_400_000;

/** Fecha civil que existe en el calendario (2026-02-30 se rechaza). */
export const fechaCivil = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha va como aaaa-mm-dd.")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), {
    message: "Esa fecha no existe.",
  });

export const solicitudInput = z
  .object({
    tipo: z.enum(TIPOS_SOLICITUD),
    desde: fechaCivil.describe("Primer día (aaaa-mm-dd)."),
    hasta: fechaCivil.describe("Último día (aaaa-mm-dd), inclusive."),
    motivo: z
      .string()
      .trim()
      .min(3, "Cuenta brevemente el motivo.")
      .max(200)
      .describe("Sin diagnósticos ni datos médicos."),
  })
  .refine((i) => i.hasta >= i.desde, { message: "«Hasta» no puede ser anterior a «desde».", path: ["hasta"] })
  .refine((i) => (Date.parse(i.hasta) - Date.parse(i.desde)) / DIA_MS < DIAS_MAX, {
    message: `Como máximo ${DIAS_MAX} días por solicitud.`,
    path: ["hasta"],
  });

export const solicitudSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  clase: z.string().nullable(),
  desde: z.string(),
  hasta: z.string(),
  motivo: z.string(),
  /** "solicitada" | "aprobada" | "rechazada" | "anulada". */
  estado: z.string(),
  /** La pidió el propio trabajador desde su portal (si no, la registró RR. HH.). */
  propia: z.boolean(),
  creadaEn: z.string(),
});

type FilaAusencia = {
  id: string;
  tipo: string;
  clase: string | null;
  desde: Date;
  hasta: Date;
  motivo: string;
  estado: string;
  registradaPor: string | null;
  createdAt: Date;
};

const dia = (d: Date) => d.toISOString().slice(0, 10);

export function vistaSolicitud(a: FilaAusencia, usuarioId: string) {
  return {
    id: a.id,
    tipo: a.tipo,
    clase: a.clase,
    desde: dia(a.desde),
    hasta: dia(a.hasta),
    motivo: a.motivo,
    estado: a.estado,
    propia: a.registradaPor === usuarioId,
    creadaEn: a.createdAt.toISOString(),
  };
}

/** Hoy (aaaa-mm-dd) en la zona de la empresa. */
export async function hoyDeLaEmpresa(ctx: Contexto): Promise<string> {
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } });
  return new Intl.DateTimeFormat("en-CA", { timeZone: t?.timezone ?? "America/Santiago" }).format(new Date());
}
