import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { personaParaAusencia } from "./ausencias-plan";
import { fechaIso, PERMISO_READ } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

const grupoSchema = z.object({
  /** Registro de la ausencia en el Núcleo (CAR-393). */
  ausenciaId: z.string(),
  tipo: tipoExcepcionSchema,
  motivo: z.string(),
  desde: z.string(),
  hasta: z.string(),
  dias: z.number().int().describe("Turnos marcados en la pauta."),
  estado: z.enum(["activa", "anulada"]),
  registradaEn: z.string(),
  instalaciones: z.array(z.string()),
});

/**
 * Permisos, licencias, vacaciones y ausencias de una persona (ADR-094, adenda CAR-311 d), leídos de su registro en el
 * Núcleo (CAR-393), del más reciente al más antiguo, con los turnos que marcan en la pauta. Un registro cuyos turnos
 * están todos en puestos fuera del alcance del actor no se muestra (ADR-022).
 */
export const ausenciasListar = defineCapability({
  id: "pauta.ausencias.listar",
  descripcion:
    "Lista los permisos, licencias, vacaciones y ausencias registrados de una persona, con sus fechas, turnos marcados en la pauta, instalaciones y si siguen activos o se anularon. Es lo que muestra la ficha del guardia.",
  permiso: PERMISO_READ,
  input: z.object({ personaId: uuidSchema, limite: z.number().int().min(1).max(100).default(30) }),
  output: z.object({ personaId: z.string(), grupos: z.array(grupoSchema) }),
  // El motivo es texto libre y puede ser de salud: la lectura queda auditada con la persona revelada.
  auditarLectura: (s) => [s.personaId],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { personaId, limite }) {
    await personaParaAusencia(ctx, personaId);
    const registros = await ctx.db.ausencia.findMany({
      where: { personaId, estado: { in: ["aprobada", "anulada"] } },
      orderBy: [{ createdAt: "desc" }, { desde: "desc" }],
      take: 500,
    });
    const turnos = await ctx.db.excepcionPauta.findMany({
      where: { ausenciaId: { in: registros.map((r) => r.id) } },
      select: { ausenciaId: true, puestoId: true, estado: true },
    });
    const puestos = await ctx.db.puesto.findMany({
      where: { id: { in: [...new Set(turnos.map((t) => t.puestoId))] }, AND: [dondePuesto(ctx)] },
      select: { id: true, instalacion: { select: { nombre: true } } },
    });
    const instalacionDe = new Map(puestos.map((p) => [p.id, p.instalacion.nombre]));
    const grupos: z.infer<typeof grupoSchema>[] = [];
    for (const r of registros) {
      if (grupos.length >= limite) break;
      // Un registro vigente cuenta sus turnos activos; uno anulado, los que tuvo.
      const suyos = turnos.filter((t) => t.ausenciaId === r.id && (r.estado === "anulada" || t.estado === "activa"));
      const visibles = suyos.flatMap((t) => instalacionDe.get(t.puestoId) ?? []);
      if (suyos.length > 0 && visibles.length === 0) continue;
      grupos.push({
        ausenciaId: r.id,
        tipo: tipoExcepcionSchema.parse(r.tipo),
        motivo: r.motivo,
        desde: fechaIso(r.desde),
        hasta: fechaIso(r.hasta),
        dias: visibles.length,
        estado: r.estado === "anulada" ? "anulada" : "activa",
        registradaEn: r.createdAt.toISOString(),
        instalaciones: [...new Set(visibles)],
      });
    }
    return { personaId, grupos };
  },
});
