import { z } from "zod";

import { GRUPOS_CUENTA, NATURALEZAS, TIPOS_CUENTA } from "@opai/domain";

export const cuentaSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  tipo: z.enum(TIPOS_CUENTA),
  naturaleza: z.enum(NATURALEZAS),
  grupo: z.enum(GRUPOS_CUENTA).nullable(),
  exigeCentroCosto: z.boolean(),
  aceptaAsientos: z.boolean(),
  padreId: z.string().nullable(),
  claveSistema: z.string().nullable(),
  activa: z.boolean(),
});

type FilaCuenta = Omit<z.input<typeof cuentaSchema>, "tipo" | "naturaleza" | "grupo"> & {
  tipo: string;
  naturaleza: string;
  grupo: string | null;
};

export const vistaCuenta = (c: FilaCuenta): z.input<typeof cuentaSchema> =>
  ({
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    tipo: c.tipo,
    naturaleza: c.naturaleza,
    grupo: c.grupo,
    exigeCentroCosto: c.exigeCentroCosto,
    aceptaAsientos: c.aceptaAsientos,
    padreId: c.padreId,
    claveSistema: c.claveSistema,
    activa: c.activa,
  }) as z.input<typeof cuentaSchema>;

export const proveedorSchema = z.object({
  id: z.string(),
  rut: z.string(),
  razonSocial: z.string(),
  giro: z.string().nullable(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  plazoPagoDias: z.number().int(),
  cuentaGastoId: z.string().nullable(),
  cuentaPorPagarId: z.string().nullable(),
  centroCostoId: z.string().nullable(),
  notas: z.string().nullable(),
  activo: z.boolean(),
});

export const vistaProveedor = (p: z.input<typeof proveedorSchema>): z.input<typeof proveedorSchema> => ({
  id: p.id,
  rut: p.rut,
  razonSocial: p.razonSocial,
  giro: p.giro,
  email: p.email,
  telefono: p.telefono,
  plazoPagoDias: p.plazoPagoDias,
  cuentaGastoId: p.cuentaGastoId,
  cuentaPorPagarId: p.cuentaPorPagarId,
  centroCostoId: p.centroCostoId,
  notas: p.notas,
  activo: p.activo,
});

export const centroVistaSchema = z.object({
  /** Id del centro si ya se usó; null si aún no existe (se crea al asignarlo por primera vez). */
  id: z.string().nullable(),
  tipo: z.enum(["instalacion", "general"]),
  instalacionId: z.string().nullable(),
  nombre: z.string(),
});

