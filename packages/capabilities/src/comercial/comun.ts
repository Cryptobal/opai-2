import { z } from "zod";

import { noEncontrado } from "../errores";
import type { Contexto } from "../types";
import { ESTADOS_NEGOCIO, ROLES_CONTACTO, TIPOS_ETAPA, TIPOS_VINCULO, TONOS_ETAPA } from "./dominio";

export const PERMISO_READ = "comercial:negocios.read";
export const PERMISO_MANAGE = "comercial:negocios.manage";
export const PERMISO_CONFIG = "comercial:config.manage";

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const dia = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);

/** Un negocio tal como lo devuelven las capacidades (fechas serializadas). */
export const negocioSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  cuentaId: z.string(),
  embudoId: z.string(),
  etapaId: z.string(),
  estado: z.enum(ESTADOS_NEGOCIO),
  tipoId: z.string().nullable(),
  origenId: z.string().nullable(),
  responsableId: z.string().nullable(),
  probabilidad: z.number(),
  montoEstimadoMensual: z.number().nullable(),
  valorMensual: z.number().nullable(),
  cotizacionEnviadaEn: z.string().nullable(),
  cierreEstimado: z.string().nullable(),
  inicioServicioEstimado: z.string().nullable(),
  motivoPerdidaId: z.string().nullable(),
  motivoPerdidaDetalle: z.string().nullable(),
  competidor: z.string().nullable(),
  ganadoEn: z.string().nullable(),
  perdidoEn: z.string().nullable(),
  archivadoEn: z.string().nullable(),
  creadoEn: z.string(),
});

type FilaNegocio = {
  id: string;
  titulo: string;
  cuentaId: string;
  embudoId: string;
  etapaId: string;
  estado: string;
  tipoId: string | null;
  origenId: string | null;
  responsableId: string | null;
  probabilidad: number;
  montoEstimadoMensual: number | null;
  valorMensual: number | null;
  cotizacionEnviadaEn: Date | null;
  cierreEstimado: Date | null;
  inicioServicioEstimado: Date | null;
  motivoPerdidaId: string | null;
  motivoPerdidaDetalle: string | null;
  competidor: string | null;
  ganadoEn: Date | null;
  perdidoEn: Date | null;
  archivadoEn: Date | null;
  createdAt: Date;
};

export function vistaNegocio(n: FilaNegocio): z.input<typeof negocioSchema> {
  return {
    id: n.id,
    titulo: n.titulo,
    cuentaId: n.cuentaId,
    embudoId: n.embudoId,
    etapaId: n.etapaId,
    estado: n.estado as (typeof ESTADOS_NEGOCIO)[number],
    tipoId: n.tipoId ?? null,
    origenId: n.origenId ?? null,
    responsableId: n.responsableId ?? null,
    probabilidad: n.probabilidad ?? 0,
    montoEstimadoMensual: n.montoEstimadoMensual ?? null,
    valorMensual: n.valorMensual ?? null,
    cotizacionEnviadaEn: iso(n.cotizacionEnviadaEn),
    cierreEstimado: dia(n.cierreEstimado),
    inicioServicioEstimado: dia(n.inicioServicioEstimado),
    motivoPerdidaId: n.motivoPerdidaId ?? null,
    motivoPerdidaDetalle: n.motivoPerdidaDetalle ?? null,
    competidor: n.competidor ?? null,
    ganadoEn: iso(n.ganadoEn),
    perdidoEn: iso(n.perdidoEn),
    archivadoEn: iso(n.archivadoEn),
    creadoEn: n.createdAt.toISOString(),
  };
}

export const etapaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  orden: z.number(),
  tipo: z.enum(TIPOS_ETAPA),
  probabilidad: z.number(),
  tono: z.enum(TONOS_ETAPA),
  exige: z.array(z.string()),
  activa: z.boolean(),
});

export const embudoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  porDefecto: z.boolean(),
  etapas: z.array(etapaSchema),
});

export const catalogoItemSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  orden: z.number(),
  activo: z.boolean(),
});

export const tipoVinculoSchema = z.enum(TIPOS_VINCULO);
export const rolContactoSchema = z.enum(ROLES_CONTACTO);

/** Busca un negocio del tenant o lanza NOT_FOUND. */
export async function negocioDe(ctx: Contexto, id: string) {
  const n = await ctx.db.negocio.findUnique({ where: { id } });
  if (!n) throw noEncontrado("El negocio");
  return n;
}

/** Busca una etapa del tenant o lanza NOT_FOUND. */
export async function etapaDe(ctx: Contexto, id: string) {
  const e = await ctx.db.etapa.findUnique({ where: { id } });
  if (!e) throw noEncontrado("La etapa");
  return e;
}

/** El embudo por defecto del tenant, con sus etapas ordenadas, o NOT_FOUND si no está sembrado. */
export async function embudoPorDefecto(ctx: Contexto) {
  const embudo = await ctx.db.embudo.findFirst({ where: { porDefecto: true } });
  if (!embudo) throw noEncontrado("El embudo");
  return embudo;
}
