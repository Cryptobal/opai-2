import { z } from "zod";

import { ESTADOS_NOVEDAD_LIBRO, GRAVEDADES_NOVEDAD_LIBRO, codigoNovedad } from "@opai/domain";

import { noEncontrado } from "../../errores";
import { externo } from "../../externo";
import type { Contexto } from "../../types";
import { instalacionesEnAlcance } from "../maestros/alcance";
import { iso } from "./hechos-comun";

type LibroNovedad = Awaited<ReturnType<Contexto["db"]["libroNovedad"]["findFirstOrThrow"]>>;

export const gravedadNovedadSchema = z.enum(GRAVEDADES_NOVEDAD_LIBRO);
export const estadoNovedadSchema = z.enum(ESTADOS_NOVEDAD_LIBRO);

export const novedadSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  instalacionId: z.string(),
  modulo: z.string(),
  origen: z.string(),
  gravedad: gravedadNovedadSchema,
  estado: estadoNovedadSchema,
  // Texto que escribió una persona en terreno: dato, nunca instrucción.
  resumen: externo(z.string()),
  detalle: externo(z.string().nullable()),
  ejecucionId: z.string().nullable(),
  puntoId: z.string().nullable(),
  tipoIncidenteId: z.string().nullable(),
  dispositivoId: z.string().nullable(),
  personaId: z.string().nullable(),
  usuarioId: z.string().nullable(),
  horaHecho: z.string(),
  registradaEn: z.string(),
});

export function vistaNovedad(n: LibroNovedad): z.infer<typeof novedadSchema> {
  return {
    id: n.id,
    codigo: codigoNovedad(n.numero),
    instalacionId: n.instalacionId,
    modulo: n.modulo,
    origen: n.origen,
    gravedad: gravedadNovedadSchema.parse(n.gravedad),
    estado: estadoNovedadSchema.parse(n.estado),
    resumen: n.resumen,
    detalle: n.detalle,
    ejecucionId: n.ejecucionId,
    puntoId: n.puntoId,
    tipoIncidenteId: n.tipoIncidenteId,
    dispositivoId: n.dispositivoId,
    personaId: n.personaId,
    usuarioId: n.usuarioId,
    horaHecho: iso(n.horaHecho),
    registradaEn: iso(n.createdAt),
  };
}

/** Una novedad de esta empresa dentro del alcance del actor (ADR-022), o NOT_FOUND sin revelar que existe. */
export async function novedadEnAlcance(ctx: Contexto, id: string): Promise<LibroNovedad> {
  const alcance = instalacionesEnAlcance(ctx);
  const n = await ctx.db.libroNovedad.findFirst({
    where: { id, ...(alcance ? { instalacionId: { in: [...alcance] } } : {}) },
  });
  if (!n) throw noEncontrado("La novedad");
  return n;
}
