// Indicador de gestión que Rondas publica en el catálogo del núcleo (ADR-094, CAR-310): rondas
// completadas con todos sus puntos. Se atribuye al guardia (Persona) que cerró la ronda; cuenta en el
// mes de su hora de cierre. Los cierres sin persona no se atribuyen.
import { porcentajeDe } from "@opai/domain";

import { defineIndicador, type IndicadorGestion, type MedicionIndicador } from "../indicadores-gestion";

export const indicadorRondasCompletas = defineIndicador({
  id: "rondas.rondas_completas",
  nombre: "Rondas completas",
  descripcion:
    "De las rondas que cerró en el período, qué porcentaje quedó completa: con todos sus puntos obligatorios marcados.",
  tipo: "calidad",
  unidad: "porcentaje",
  sentido: "mayor",
  sujeto: "persona",
  metaSugerida: 95,
  origen: "cierres de ronda: puntos obligatorios y puntos marcados",
  permiso: "rondas:read",
  async medir(ctx, { rango, sujetos }) {
    const cierres = await ctx.db.cierreRonda.findMany({
      where: {
        horaCierre: { gte: rango.desde, lt: rango.hasta },
        personaId: sujetos ? { in: [...sujetos] } : { not: null },
      },
      select: { personaId: true, estado: true, puntosObligatorios: true, puntosMarcados: true },
    });
    const cuenta = new Map<string, { total: number; completas: number }>();
    for (const c of cierres) {
      if (!c.personaId) continue;
      const k = cuenta.get(c.personaId) ?? { total: 0, completas: 0 };
      k.total += 1;
      if (c.estado === "completada" && c.puntosMarcados >= c.puntosObligatorios) k.completas += 1;
      cuenta.set(c.personaId, k);
    }
    return [...cuenta].map(
      ([sujetoId, k]): MedicionIndicador => ({ sujetoId, valor: porcentajeDe(k.completas, k.total) }),
    );
  },
});

export const indicadoresRondas: readonly IndicadorGestion[] = [indicadorRondasCompletas];
