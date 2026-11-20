import { z } from "zod";

import { diaEnZona, diasPrerregistro, estadoDiaPrerregistro } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { tenantActual } from "../core/comun";
import type { Contexto } from "../types";

/** Prerregistrar visitas (R13): contactos del cliente con permiso, usuarios con alcance y agentes con ese permiso. */
export const PERMISO_PRERREGISTRO = "acceso:prerregistros.create";

/** Día `aaaa-mm-dd` que existe en el calendario (rechaza «2026-02-31» en vez de correrlo al 3 de marzo). */
export const diaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato aaaa-mm-dd.")
  .refine((v) => {
    const t = Date.parse(`${v}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
  }, "Ese día no existe.");

/** Un prerregistro tal como se muestra: documentos enmascarados y estado por día (R15). */
export const prerregistroSchema = z.object({
  id: uuidSchema,
  instalacionId: uuidSchema,
  instalacion: z.string(),
  desde: z.string(),
  hasta: z.string(),
  desdeMin: z.number().int().nullable(),
  hastaMin: z.number().int().nullable(),
  anfitrion: z.string(),
  motivo: z.string().nullable(),
  nota: z.string().nullable(),
  avisarLlegada: z.boolean(),
  cancelado: z.boolean(),
  visitantes: z.array(
    z.object({
      id: uuidSchema,
      nombre: z.string(),
      docTipo: z.string(),
      documento: z.string(),
      empresa: z.string().nullable(),
      patente: z.string().nullable(),
      ingresos: z.array(z.string()).describe("Días en que este visitante ya entró."),
      proximoDia: z.string().nullable().describe("Próximo día con invitación disponible, o null."),
    }),
  ),
  dias: z.array(
    z.object({
      dia: z.string(),
      estado: z.enum(["pendiente", "ingreso", "no_llego", "cancelado"]),
      ingresos: z.number().int(),
    }),
  ),
});
export type PrerregistroVista = z.infer<typeof prerregistroSchema>;

export const fechaDia = (dia: string) => new Date(`${dia}T00:00:00Z`);
const textoDia = (d: Date) => d.toISOString().slice(0, 10);

/** Hoy (`aaaa-mm-dd`) en la zona horaria de la empresa: ahí se cuentan los días del prerregistro (R14). */
export async function hoyEmpresa(ctx: Contexto): Promise<string> {
  const { timezone } = await tenantActual(ctx);
  return diaEnZona(new Date(), timezone);
}

type Fila = {
  id: string;
  instalacionId: string;
  desde: Date;
  hasta: Date;
  desdeMin: number | null;
  hastaMin: number | null;
  anfitrion: string;
  motivo: string | null;
  nota: string | null;
  avisarLlegada: boolean;
  canceladoEn: Date | null;
  visitantes: {
    id: string;
    nombre: string;
    docTipo: string;
    mascara: string;
    empresa: string | null;
    patente: string | null;
    usos?: { dia: Date }[];
  }[];
};

/** Vista de un prerregistro. La patente completa solo con `acceso:datos.ver_patente`, como en los registros. */
export function vistaPrerregistro(
  f: Fila,
  o: { instalacion: string; hoy: string; verPatente: boolean },
): PrerregistroVista {
  const cancelado = f.canceladoEn !== null;
  const dias = diasPrerregistro(textoDia(f.desde), textoDia(f.hasta));
  const ingresos = (v: Fila["visitantes"][number]) => (v.usos ?? []).map((u) => textoDia(u.dia));
  return {
    id: f.id,
    instalacionId: f.instalacionId,
    instalacion: o.instalacion,
    desde: textoDia(f.desde),
    hasta: textoDia(f.hasta),
    desdeMin: f.desdeMin,
    hastaMin: f.hastaMin,
    anfitrion: f.anfitrion,
    motivo: f.motivo,
    nota: f.nota,
    avisarLlegada: f.avisarLlegada,
    cancelado,
    visitantes: f.visitantes.map((v) => ({
      id: v.id,
      nombre: v.nombre,
      docTipo: v.docTipo,
      documento: v.mascara,
      empresa: v.empresa,
      patente: o.verPatente ? v.patente : null,
      ingresos: ingresos(v),
      proximoDia: cancelado
        ? null
        : (dias.find((d) => d >= o.hoy && !ingresos(v).includes(d)) ?? null),
    })),
    dias: dias.map((dia) => {
      const n = f.visitantes.filter((v) => ingresos(v).includes(dia)).length;
      return {
        dia,
        ingresos: n,
        estado: estadoDiaPrerregistro({ dia, hoy: o.hoy, cancelado, ingresos: n }),
      };
    }),
  };
}