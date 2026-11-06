import type { Contexto } from "../types";

/**
 * Personas que se pueden elegir como titular de un puesto de la instalación: activas, no archivadas
 * y con vínculo vigente en ella (el mismo criterio con que la pauta valida al fijar la serie).
 */
export async function candidatosDeInstalacion(ctx: Contexto, instalacionId: string) {
  const filas = await ctx.db.persona.findMany({
    where: {
      estado: "activa",
      archivadaEn: null,
      vinculos: { some: { estado: "vigente", instalacionId } },
    },
    select: { id: true, nombres: true, apellidos: true },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    take: 300,
  });
  return filas.map((c) => ({ id: c.id, nombre: `${c.nombres} ${c.apellidos}` }));
}
