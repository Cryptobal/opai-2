import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, type Contexto } from "@opai/capabilities";

import { ETIQUETA_GPS, ETIQUETA_METODO, ETIQUETA_TIPO, tenantBasico } from "./formato";
import { marcaVistaSchema, uuid, vistaDeMarca } from "./esquemas";
import { personaPropia } from "./persona-propia";

const PORTALES = ["erp", "supervisor", "trabajador", "terreno"] as const;
const dePersona = (ctx: Contexto) => ctx.portal === "trabajador" || ctx.portal === "terreno";

/**
 * Filtro de filas (ADR-022): el trabajador ve solo lo propio; quien tiene `asistencia:ver` ve lo de las
 * instalaciones a su cargo (el supervisor) o de toda la empresa (alcance nulo). Se aplica en la consulta.
 */
export async function alcanceMarcas(ctx: Contexto): Promise<{ personaId?: string; instalacionId?: { in: string[] } }> {
  if (dePersona(ctx)) return { personaId: (await personaPropia(ctx)).id };
  if (!ctx.autorizar("asistencia:ver")) throw prohibido("Ver marcas exige el permiso asistencia:ver.");
  return ctx.alcance ? { instalacionId: { in: [...ctx.alcance.instalaciones] } } : {};
}

export const marcasObtener = defineCapability({
  id: "asistencia.marcas.obtener",
  descripcion:
    "Obtiene una marca legal de asistencia por su identificador, con el mismo alcance que el listado: el trabajador solo ve las suyas y el supervisor las de sus instalaciones.",
  permiso: null,
  portales: PORTALES,
  input: z.object({ id: uuid }),
  output: marcaVistaSchema.extend({
    personaNombre: z.string(),
    instalacionNombre: z.string(),
    dispositivoId: z.string().nullable(),
    dispositivoNombre: z.string().nullable(),
    tipoEtiqueta: z.string(),
    metodoEtiqueta: z.string(),
    gpsEtiqueta: z.string(),
    slugEmpresa: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.id],
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const f = await ctx.db.marca.findFirst({ where: { id: i.id, AND: [alcance] } });
    if (!f) throw noEncontrado("La marca");
    const [persona, instalacion, dispositivo, slug] = await Promise.all([
      ctx.db.persona.findUnique({ where: { id: f.personaId }, select: { nombres: true, apellidos: true } }),
      ctx.db.instalacion.findUnique({ where: { id: f.instalacionId }, select: { nombre: true } }),
      f.dispositivoId ? ctx.db.dispositivo.findUnique({ where: { id: f.dispositivoId }, select: { nombre: true } }) : null,
      tenantBasico(ctx),
    ]);
    const vista = vistaDeMarca(f);
    return {
      ...vista,
      dispositivoId: f.dispositivoId ?? null,
      dispositivoNombre: dispositivo?.nombre ?? null,
      personaNombre: persona ? `${persona.nombres} ${persona.apellidos}`.trim() : f.personaId,
      instalacionNombre: instalacion?.nombre ?? f.instalacionId,
      tipoEtiqueta: ETIQUETA_TIPO[vista.tipo] ?? vista.tipo,
      metodoEtiqueta: ETIQUETA_METODO[vista.metodo] ?? vista.metodo,
      gpsEtiqueta: ETIQUETA_GPS[vista.gpsEstado] ?? vista.gpsEstado,
      slugEmpresa: slug.slug,
    };
  },
});
