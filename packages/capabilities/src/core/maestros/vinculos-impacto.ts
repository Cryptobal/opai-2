import type { Contexto } from "../../types";
import { aFecha } from "./comun";
import { dondePersona } from "./alcance";

/** Personas cuya resolución usa la capa modificada; nunca se infiere por cargo. */
export async function personasAfectadas(ctx: Contexto, nivel: string, ref: string, fecha: string) {
  if (nivel === "persona") return 1;
  if (nivel !== "instalacion" && nivel !== "puesto") return 0;
  const vigente = {
    estado: "vigente",
    vigenteDesde: { lte: aFecha(fecha) },
    OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFecha(fecha) } }],
  };
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: {
      estado: "vigente",
      persona: dondePersona(ctx),
      ...(nivel === "instalacion" ? { instalacionId: ref } : { puestoId: ref }),
    },
  });
  const capas = await ctx.db.estructuraSueldo.findMany({
    where: {
      ...vigente,
      OR: [
        { nivel: "persona", personaId: { in: vinculos.map((v) => v.personaId) } },
        ...(nivel === "instalacion"
          ? [
              {
                nivel: "puesto",
                puestoId: { in: vinculos.flatMap((v) => (v.puestoId ? [v.puestoId] : [])) },
              },
            ]
          : []),
      ],
      AND: [{ OR: vigente.OR }],
    },
  });
  return vinculos.filter(
    (v) =>
      !capas.some(
        (c) => c.personaId === v.personaId || (c.nivel === "puesto" && c.puestoId === v.puestoId),
      ),
  ).length;
}
