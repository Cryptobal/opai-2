import { z } from "zod";

import { iso } from "../comun";
import { dia, diaSchema, textoOpcional } from "./comun";

export const ESTADOS_INSTALACION = ["prospecto", "activa", "inactiva"] as const;

export const instalacionSchema = z.object({
  id: z.string(),
  cuentaId: z.string(),
  cuenta: z.string().nullable().describe("Nombre de la cuenta."),
  nombre: z.string(),
  estado: z.enum(ESTADOS_INSTALACION),
  calle: z.string().nullable(),
  comuna: z.string().nullable(),
  region: z.string().nullable(),
  direccionFormateada: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  geocercaM: z.number().describe("Tolerancia de ubicación en metros (evidencia, no bloquea)."),
  vigenteDesde: z.string().nullable(),
  vigenteHasta: z.string().nullable(),
  notas: z.string().nullable(),
  archivadaEn: z.string().nullable(),
});

type Decimalish = { toString(): string } | number | null | undefined;
const num = (v: Decimalish) => (v === null || v === undefined ? null : Number(v.toString()));

export type FilaInstalacion = {
  id: string;
  cuentaId: string;
  nombre: string;
  estado: string;
  calle?: string | null;
  comuna?: string | null;
  region?: string | null;
  direccionFormateada?: string | null;
  lat?: Decimalish;
  lng?: Decimalish;
  geocercaM?: number | null;
  vigenteDesde?: Date | null;
  vigenteHasta?: Date | null;
  notas?: string | null;
  archivadaEn?: Date | null;
};

export function vistaInstalacion(i: FilaInstalacion, cuenta: string | null = null) {
  return {
    id: i.id,
    cuentaId: i.cuentaId,
    cuenta,
    nombre: i.nombre,
    estado: i.estado as (typeof ESTADOS_INSTALACION)[number],
    calle: i.calle ?? null,
    comuna: i.comuna ?? null,
    region: i.region ?? null,
    direccionFormateada: i.direccionFormateada ?? null,
    lat: num(i.lat),
    lng: num(i.lng),
    geocercaM: i.geocercaM ?? 1000,
    vigenteDesde: dia(i.vigenteDesde),
    vigenteHasta: dia(i.vigenteHasta),
    notas: i.notas ?? null,
    archivadaEn: iso(i.archivadaEn),
  };
}

export const camposInstalacion = {
  nombre: z.string().trim().min(2).max(160),
  calle: textoOpcional(200),
  comuna: textoOpcional(80),
  region: textoOpcional(80),
  placeId: textoOpcional(300).describe("Lugar elegido en core.geo.autocompletar, si lo hay."),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  geocercaM: z.number().int().min(50).max(20_000).optional(),
  vigenteDesde: diaSchema.nullable().optional(),
  vigenteHasta: diaSchema.nullable().optional(),
  notas: textoOpcional(4000),
};
