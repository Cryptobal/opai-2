import { z } from "zod";

import {
  CAMPOS_FIJOS,
  CONFIG_ACCESO_DEFECTO,
  type ConfigAcceso,
  configEfectiva,
  esCampoPersonalizado,
  FRECUENCIAS_REPORTE,
  MAX_CAMPOS,
  TIPOS_REGISTRO,
} from "@opai/domain";

import type { Contexto } from "../types";

/** Configurar el acceso de la empresa y de cada instalación (§7: owner y admin; a un agente, con aprobación). */
export const PERMISO_CONFIG = "acceso:config.manage";

const campoSchema = z
  .object({
    id: z.string().regex(/^(empresa|motivo|patente|c_[a-z0-9]{1,20})$/),
    etiqueta: z.string().trim().min(2).max(60),
    activo: z.boolean(),
    obligatorio: z.boolean(),
  })
  .strict();

/** Configuración completa: los tres campos fijos van siempre (se apagan, no se quitan) y los ids no se repiten. */
export const configSchema = z
  .object({
    tipos: z.array(z.enum(TIPOS_REGISTRO)).min(1).max(TIPOS_REGISTRO.length),
    campos: z.array(campoSchema).max(MAX_CAMPOS),
    validarRut: z.boolean(),
    permitirFueraDeLista: z.boolean(),
    permanenciaMaxMin: z.number().int().min(15).max(1_440).nullable(),
    cierreHora: z.number().int().min(0).max(23).nullable(),
    reporteFrecuencia: z.enum(FRECUENCIAS_REPORTE),
    reporteDestinatarios: z.array(z.email()).max(20),
    avisoPrivacidad: z.string().trim().min(20).max(400),
  })
  .strict()
  .refine((c) => new Set(c.tipos).size === c.tipos.length, {
    message: "Un tipo de ingreso está repetido.",
  })
  .refine((c) => new Set(c.campos.map((f) => f.id)).size === c.campos.length, {
    message: "Un campo está repetido.",
  })
  .refine(
    (c) =>
      CAMPOS_FIJOS.every((id) => c.campos.some((f) => f.id === id)) &&
      c.campos.every((f) => esCampoPersonalizado(f.id) || CAMPOS_FIJOS.some((id) => id === f.id)),
    { message: "Faltan los campos empresa, motivo y patente." },
  ) satisfies z.ZodType<ConfigAcceso>;

/** Lo guardado se vuelve a validar al leer: una fila que ya no calza con el esquema cuenta como no configurada. */
export const parsearConfig = (v: unknown): ConfigAcceso | null => {
  const base = typeof v === "object" && v !== null ? { ...CONFIG_ACCESO_DEFECTO, ...v } : v;
  const r = configSchema.safeParse(base);
  return r.success ? r.data : null;
};

/** Configuración de la empresa y, si se pide y existe, la propia de la instalación (la RLS acota al tenant). */
export async function leerConfig(ctx: Contexto, instalacionId: string | null) {
  const filas = await ctx.db.configAcceso.findMany({
    where: { OR: [{ instalacionId: null }, ...(instalacionId ? [{ instalacionId }] : [])] },
    select: { instalacionId: true, valor: true },
  });
  const de = (id: string | null) => filas.find((f) => f.instalacionId === id);
  const empresa = de(null);
  const propia = instalacionId ? de(instalacionId) : undefined;
  return {
    empresa: empresa ? parsearConfig(empresa.valor) : null,
    instalacion: propia ? parsearConfig(propia.valor) : null,
  };
}

/** Configuración que rige en una instalación: la suya, o la de la empresa, o la de fábrica. */
export async function configDeInstalacion(
  ctx: Contexto,
  instalacionId: string,
): Promise<ConfigAcceso> {
  const c = await leerConfig(ctx, instalacionId);
  return configEfectiva(c.empresa, c.instalacion);
}
