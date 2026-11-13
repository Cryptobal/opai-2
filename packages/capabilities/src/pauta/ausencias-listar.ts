import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { personaParaAusencia } from "./ausencias-plan";
import { fechaIso, PERMISO_READ } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

const grupoSchema = z.object({
  tipo: tipoExcepcionSchema,
  motivo: z.string(),
  desde: z.string(),
  hasta: z.string(),
  dias: z.number().int().describe("Turnos con la excepción."),
  estado: z.enum(["activa", "anulada"]),
  registradaEn: z.string(),
  instalaciones: z.array(z.string()),
});

/**
 * Permisos, licencias, vacaciones y ausencias de una persona tal como están en la pauta (ADR-094, adenda CAR-311 d):
 * agrupados por registro (mismo tipo, motivo y momento), del más reciente al más antiguo. Solo puestos en el alcance.
 */
export const ausenciasListar = defineCapability({
  id: "pauta.ausencias.listar",
  descripcion:
    "Lista los permisos, licencias, vacaciones y ausencias de una persona registrados en la pauta, agrupados por registro, con sus fechas, turnos afectados, instalaciones y si siguen activos o se anularon. Es lo que muestra la ficha del guardia.",
  permiso: PERMISO_READ,
  input: z.object({ personaId: uuidSchema, limite: z.number().int().min(1).max(100).default(30) }),
  output: z.object({ personaId: z.string(), grupos: z.array(grupoSchema) }),
  // El motivo es texto libre y puede ser de salud: la lectura queda auditada con la persona revelada.
  auditarLectura: (s) => [s.personaId],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { personaId, limite }) {
    await personaParaAusencia(ctx, personaId);
    const todas = await ctx.db.excepcionPauta.findMany({
      where: { personaId, tipo: { in: [...tipoExcepcionSchema.options] } },
      select: {
        fecha: true,
        tipo: true,
        motivo: true,
        estado: true,
        createdAt: true,
        puestoId: true,
      },
      orderBy: [{ createdAt: "desc" }, { fecha: "asc" }],
      take: 2000,
    });
    const puestos = await ctx.db.puesto.findMany({
      where: { id: { in: [...new Set(todas.map((f) => f.puestoId))] }, AND: [dondePuesto(ctx)] },
      select: { id: true, instalacion: { select: { nombre: true } } },
    });
    const instalacionDe = new Map(puestos.map((p) => [p.id, p.instalacion.nombre]));
    const filas = todas.flatMap((f) => {
      const instalacion = instalacionDe.get(f.puestoId);
      return instalacion ? [{ ...f, instalacion }] : [];
    });
    const grupos = new Map<string, z.infer<typeof grupoSchema>>();
    for (const f of filas) {
      const clave = `${f.createdAt.toISOString()}|${f.tipo}|${f.motivo}|${f.estado}`;
      const fecha = fechaIso(f.fecha);
      const g = grupos.get(clave);
      if (!g) {
        if (grupos.size >= limite) continue;
        grupos.set(clave, {
          tipo: tipoExcepcionSchema.parse(f.tipo),
          motivo: f.motivo,
          desde: fecha,
          hasta: fecha,
          dias: 1,
          estado: f.estado === "anulada" ? "anulada" : "activa",
          registradaEn: f.createdAt.toISOString(),
          instalaciones: [f.instalacion],
        });
        continue;
      }
      g.dias += 1;
      if (fecha < g.desde) g.desde = fecha;
      if (fecha > g.hasta) g.hasta = fecha;
      if (!g.instalaciones.includes(f.instalacion)) g.instalaciones.push(f.instalacion);
    }
    return { personaId, grupos: [...grupos.values()] };
  },
});
