import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { mesesDe, PERMISOS_DESEMPENO } from "./comun";
import { PREFIJO_PROPIO } from "./propios-comun";

export const propiosArchivar = defineCapability({
  id: "desempeno.propios.archivar",
  descripcion:
    "Archiva un indicador propio para que no se pueda agregar a nuevos scorecards. No se puede archivar mientras esté en el scorecard publicado de algún cargo: primero hay que sacarlo de ahí. Los meses ya medidos no cambian.",
  permiso: PERMISOS_DESEMPENO.scorecardsManage,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: z.string(), archivado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  // Archivar no tiene vuelta atrás: a un agente siempre le pide aprobación humana.
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.desempenoIndicadorPropio.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("El indicador propio");
    const { actual: mes } = await mesesDe(ctx);
    const versiones = await ctx.db.desempenoScorecard.findMany({
      where: { estado: "publicado" },
      select: {
        cargoId: true,
        vigenteDesde: true,
        indicadores: { select: { indicador: true } },
      },
    });
    // En uso = está en el scorecard que rige hoy en algún cargo, o en uno que rige más adelante.
    const id = `${PREFIJO_PROPIO}${input.id}`;
    const rigeHoy = new Map<string, string>();
    for (const v of versiones) {
      if (v.vigenteDesde <= mes && v.vigenteDesde > (rigeHoy.get(v.cargoId) ?? "")) {
        rigeHoy.set(v.cargoId, v.vigenteDesde);
      }
    }
    const cargos = new Set(
      versiones
        .filter((v) => v.vigenteDesde > mes || rigeHoy.get(v.cargoId) === v.vigenteDesde)
        .filter((v) => v.indicadores.some((x) => x.indicador === id))
        .map((v) => v.cargoId),
    );
    if (cargos.size > 0) {
      const nombres = await ctx.db.cargo.findMany({
        where: { id: { in: [...cargos] } },
        select: { nombre: true },
        orderBy: { nombre: "asc" },
      });
      const lista = nombres.map((c) => `«${c.nombre}»`).join(", ");
      throw reglaDeNegocio(`Está en el scorecard publicado de ${lista}: sácalo de ahí primero.`);
    }
    if (dryRun || actual.archivadoEn) return { id: actual.id, archivado: true };
    await ctx.transaccion(async (tx) => {
      await tx.desempenoIndicadorPropio.update({
        where: { id: actual.id },
        data: { archivadoEn: new Date() },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "desempeno.propio.archivado",
        entidadTipo: "indicador_propio",
        entidadId: actual.id,
        payload: { nombre: actual.nombre },
      });
    });
    return { id: actual.id, archivado: true };
  },
});
