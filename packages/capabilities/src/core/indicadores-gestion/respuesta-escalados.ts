import { PERMISOS_CORE } from "@opai/domain";

import { SIN_PLATAFORMA } from "../../agentes/plataforma";
import { defineIndicador, type MedicionIndicador } from "../../indicadores-gestion";

const HORA_MS = 3_600_000;

/**
 * Tiempo de respuesta a lo que un agente escaló (ADR-094, CAR-312). Lo escalado es una aprobación
 * pedida por un agente (la cola de `core.aprobaciones`); se atribuye a quien la resolvió, aprobándola
 * o rechazándola, y se mide desde que el agente la pidió hasta la decisión. Cuenta en el mes en que
 * se resolvió. Las que vencieron sin decisión no tienen a quién atribuirse y no cuentan; las de
 * plataforma nunca entran (CAR-36).
 */
export const indicadorRespuestaEscalados = defineIndicador({
  id: "core.respuesta_escalados",
  nombre: "Tiempo de respuesta a lo escalado por agentes",
  descripcion:
    "Cuántas horas tarda en promedio en aprobar o rechazar lo que un agente le escaló para su decisión. Se mide desde que el agente lo pidió hasta la decisión; las que vencieron sin decisión no cuentan.",
  tipo: "oportunidad",
  unidad: "horas",
  sentido: "menor",
  sujeto: "usuario",
  metaSugerida: 4,
  origen: "aprobaciones pedidas por agentes, su hora de pedido y su hora de decisión",
  permiso: PERMISOS_CORE.aprobacionesManage,
  async medir(ctx, { rango, sujetos }) {
    const filas = await ctx.db.aprobacion.findMany({
      where: {
        estado: { in: ["aprobada", "rechazada"] },
        resueltaEn: { gte: rango.desde, lt: rango.hasta },
        resueltaPor: sujetos ? { in: [...sujetos] } : { not: null },
        ...SIN_PLATAFORMA,
      },
      select: { createdAt: true, resueltaEn: true, resueltaPor: true },
    });
    const suma = new Map<string, { horas: number; n: number }>();
    for (const f of filas) {
      if (!f.resueltaPor || !f.resueltaEn) continue;
      const horas = Math.max(0, f.resueltaEn.getTime() - f.createdAt.getTime()) / HORA_MS;
      const s = suma.get(f.resueltaPor) ?? { horas: 0, n: 0 };
      s.horas += horas;
      s.n += 1;
      suma.set(f.resueltaPor, s);
    }
    return [...suma].map(
      ([sujetoId, s]): MedicionIndicador => ({
        sujetoId,
        valor: Math.round((s.horas / s.n) * 10) / 10,
      }),
    );
  },
});
