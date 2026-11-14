import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import type { Contexto } from "../types";
import { personaParaAusencia } from "./ausencias-plan";
import { fechaIso, PERMISO_READ } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

const grupoSchema = z.object({
  /** Registro de la ausencia en el Núcleo (CAR-393). */
  ausenciaId: z.string(),
  tipo: tipoExcepcionSchema,
  motivo: z.string(),
  clase: z.string().nullable(),
  desde: z.string(),
  hasta: z.string(),
  dias: z.number().int().describe("Turnos marcados en la pauta."),
  estado: z.enum(["activa", "anulada"]),
  registradaEn: z.string(),
  instalaciones: z.array(z.string()),
});

export const entradaListaAusencias = z.object({
  personaId: uuidSchema,
  limite: z.number().int().min(1).max(100).default(30),
});
export const salidaListaAusencias = z.object({
  personaId: z.string(),
  grupos: z.array(grupoSchema),
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
  input: entradaListaAusencias,
  output: salidaListaAusencias,
  // El motivo es texto libre y puede ser de salud: la lectura queda auditada con la persona revelada.
  auditarLectura: (s) => [s.personaId, ...s.grupos.map((g) => g.ausenciaId)],
  efecto: "lectura",
  dryRun: false,
  handler: (ctx, input) => listarAusencias(ctx, input),
});

/** Registros de ausencia de la persona (CAR-393); la comparten la ficha de la pauta y la del Núcleo. */
export async function listarAusencias(
  ctx: Contexto,
  {
    personaId,
    limite,
    cursor,
  }: z.output<typeof entradaListaAusencias> & { cursor?: string | undefined },
): Promise<z.infer<typeof salidaListaAusencias> & { siguiente: string | null }> {
  await personaParaAusencia(ctx, personaId);
  // Cursor opaco = id del último registro de la página anterior (CAR-353); mismo orden estable que la lista.
  const desdeCursor = cursor
    ? await ctx.db.ausencia.findFirst({
        where: { id: cursor, personaId },
        select: { id: true, createdAt: true },
      })
    : null;
  if (cursor && !desdeCursor) return { personaId, grupos: [], siguiente: null };
  const registros = await ctx.db.ausencia.findMany({
    where: {
      personaId,
      estado: { in: ["aprobada", "anulada"] },
      ...(desdeCursor
        ? {
            OR: [
              { createdAt: { lt: desdeCursor.createdAt } },
              { createdAt: desdeCursor.createdAt, id: { lt: desdeCursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 500,
  });
  const turnos = await ctx.db.excepcionPauta.findMany({
    where: { ausenciaId: { in: registros.map((r) => r.id) } },
    select: { ausenciaId: true, puestoId: true, estado: true, fecha: true },
  });
  const puestos = await ctx.db.puesto.findMany({
    where: { id: { in: [...new Set(turnos.map((t) => t.puestoId))] }, AND: [dondePuesto(ctx)] },
    select: { id: true, instalacion: { select: { nombre: true } } },
  });
  const instalacionDe = new Map(puestos.map((p) => [p.id, p.instalacion.nombre]));
  const grupos: z.infer<typeof grupoSchema>[] = [];
  let siguiente: string | null = null;
  for (const r of registros) {
    if (grupos.length >= limite) {
      siguiente = grupos[grupos.length - 1]!.ausenciaId;
      break;
    }
    // Un registro vigente cuenta sus turnos activos; uno anulado, los que tuvo.
    const suyos = turnos.filter(
      (t) => t.ausenciaId === r.id && (r.estado === "anulada" || t.estado === "activa"),
    );
    const enAlcance = suyos.filter((t) => instalacionDe.has(t.puestoId));
    const visibles = enAlcance.map((t) => instalacionDe.get(t.puestoId)!);
    if (suyos.length > 0 && visibles.length === 0) continue;
    // Con turnos fuera del alcance, el rango que se muestra es el de los turnos visibles (ADR-022).
    const fechas =
      enAlcance.length < suyos.length ? enAlcance.map((t) => fechaIso(t.fecha)).sort() : null;
    grupos.push({
      ausenciaId: r.id,
      tipo: tipoExcepcionSchema.parse(r.tipo),
      motivo: r.motivo,
      clase: r.clase,
      desde: fechas?.[0] ?? fechaIso(r.desde),
      hasta: fechas?.[fechas.length - 1] ?? fechaIso(r.hasta),
      dias: visibles.length,
      estado: r.estado === "anulada" ? "anulada" : "activa",
      registradaEn: r.createdAt.toISOString(),
      instalaciones: [...new Set(visibles)],
    });
  }
  return { personaId, grupos, siguiente };
}
