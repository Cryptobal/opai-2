import { z } from "zod";

import { iso } from "../comun";
import { dia, diaSchema, rutSchema, textoOpcional } from "./comun";

export const ESTADOS_CUENTA = ["prospecto", "cliente_activo", "cliente_inactivo"] as const;

export const cuentaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  razonSocial: z.string().nullable(),
  rut: z.string().nullable(),
  giro: z.string().nullable(),
  estado: z.enum(ESTADOS_CUENTA),
  origen: z.string().nullable(),
  sitioWeb: z.string().nullable(),
  calle: z.string().nullable(),
  comuna: z.string().nullable(),
  region: z.string().nullable(),
  escrituraFecha: z.string().nullable(),
  escrituraNotaria: z.string().nullable(),
  notas: z.string().nullable(),
  clienteDesde: z.string().nullable(),
  clienteHasta: z.string().nullable(),
  archivadaEn: z.string().nullable(),
  creadaEn: z.string(),
});

type FilaCuenta = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  giro: string | null;
  estado: string;
  origen: string | null;
  sitioWeb: string | null;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  escrituraFecha: Date | null;
  escrituraNotaria: string | null;
  notas: string | null;
  clienteDesde: Date | null;
  clienteHasta: Date | null;
  archivadaEn: Date | null;
  createdAt: Date;
};

export function vistaCuenta(c: FilaCuenta): z.input<typeof cuentaSchema> {
  const n = <T>(v: T | null | undefined) => v ?? null;
  return {
    id: c.id,
    nombre: c.nombre,
    razonSocial: n(c.razonSocial),
    rut: n(c.rut),
    giro: n(c.giro),
    estado: c.estado as (typeof ESTADOS_CUENTA)[number],
    origen: n(c.origen),
    sitioWeb: n(c.sitioWeb),
    calle: n(c.calle),
    comuna: n(c.comuna),
    region: n(c.region),
    escrituraFecha: dia(c.escrituraFecha),
    escrituraNotaria: n(c.escrituraNotaria),
    notas: n(c.notas),
    clienteDesde: dia(c.clienteDesde),
    clienteHasta: dia(c.clienteHasta),
    archivadaEn: iso(c.archivadaEn),
    creadaEn: c.createdAt.toISOString(),
  };
}

/** Campos editables de una cuenta (create los exige según el caso; update todos opcionales). */
export const camposCuenta = {
  nombre: z.string().trim().min(2).max(160).describe("Nombre de fantasía o comercial."),
  razonSocial: textoOpcional(200),
  rut: rutSchema.nullable().optional(),
  giro: textoOpcional(200),
  origen: textoOpcional(80).describe("Cómo llegó: referido, licitación, web…"),
  sitioWeb: textoOpcional(200),
  calle: textoOpcional(200),
  comuna: textoOpcional(80),
  region: textoOpcional(80),
  escrituraFecha: diaSchema.nullable().optional(),
  escrituraNotaria: textoOpcional(160),
  notas: textoOpcional(4000),
};
