import { z } from "zod";

import { diaEnZona, diasPrerregistro, estadoDiaPrerregistro } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { tenantActual } from "../core/comun";
import type { Contexto } from "../types";

/** Prerregistrar visitas (R13): contactos del cliente con permiso, usuarios con alcance y agentes con ese permiso. */
export const PERMISO_PRERREGISTRO = "acceso:prerregistros.create";

export const diaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato aaaa-mm-dd.");

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
    }),
  ),
  dias: z.array(
    z.object({ dia: z.string(), estado: z.enum(["pendiente", "no_llego", "cancelado"]) }),
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
  }[];
};

/** Vista de un prerregistro. La patente completa solo con `acceso:datos.ver_patente`, como en los registros. */
export function vistaPrerregistro(
  f: Fila,
  o: { instalacion: string; hoy: string; verPatente: boolean },
): PrerregistroVista {
  const cancelado = f.canceladoEn !== null;
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
    })),
    dias: diasPrerregistro(textoDia(f.desde), textoDia(f.hasta)).map((dia) => ({
      dia,
      estado: estadoDiaPrerregistro({ dia, hoy: o.hoy, cancelado }),
    })),
  };
}
