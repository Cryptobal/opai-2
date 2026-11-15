// Apertura de la lista de ingreso o de salida de un vínculo (CAR-355). La llama el consumidor de
// eventos; es idempotente (índice único por vínculo y tipo) y nunca falla por la plantilla: una
// plantilla inválida cae a la de la vertical de la empresa.
import { esContinuidad, plantillaEfectiva, venceDe, type TipoProcesoPersona } from "@opai/domain";

import { ajuste } from "../config";
import type { Contexto } from "../../types";
import { crearTarea, tituloTarea } from "./comun";

const dia = (d: Date) => d.toISOString().slice(0, 10);

/** ¿Hay que abrir la lista? Ingreso: vínculo vigente y sin continuidad. Salida: sin vínculos vigentes. */
export async function debeAbrir(ctx: Contexto, vinculoId: string, tipo: TipoProcesoPersona) {
  const v = await ctx.db.vinculoLaboral.findUnique({ where: { id: vinculoId } });
  if (!v) return null;
  if (tipo === "salida") {
    if (v.estado !== "terminado") return null;
    const vigentes = await ctx.db.vinculoLaboral.count({ where: { personaId: v.personaId, estado: "vigente" } });
    return vigentes ? null : v;
  }
  if (v.estado !== "vigente") return null;
  const previos = await ctx.db.vinculoLaboral.findMany({
    where: { personaId: v.personaId, id: { not: v.id } },
    select: { termino: true },
  });
  return esContinuidad(dia(v.inicio), previos.map((p) => (p.termino ? dia(p.termino) : null))) ? null : v;
}

/**
 * Abre la lista con los pasos de la plantilla. `responsableId` (quien registró el vínculo) recibe una
 * tarea por paso si es miembro activo de la empresa; si no (un agente sin usuario), los pasos quedan
 * sin responsable y se asignan desde la ficha. Devuelve el id de la lista o null si ya existía.
 */
export async function abrirProceso(
  ctx: Contexto,
  vinculoId: string,
  tipo: TipoProcesoPersona,
  responsableId: string | null,
): Promise<string | null> {
  const v = await debeAbrir(ctx, vinculoId, tipo);
  if (!v) return null;
  const ya = await ctx.db.procesoPersona.findUnique({ where: { vinculoId_tipo: { vinculoId, tipo } } });
  if (ya) return null;
  const [tenant, persona, propia, miembro] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { vertical: true } }),
    ctx.db.persona.findUnique({ where: { id: v.personaId }, select: { nombres: true, apellidos: true } }),
    ajuste<unknown>(ctx, "core", tipo === "ingreso" ? "personas_pasos_ingreso" : "personas_pasos_salida"),
    responsableId
      ? ctx.db.membership.findFirst({ where: { userId: responsableId, estado: "activa" }, select: { userId: true } })
      : null,
  ]);
  const pasos = plantillaEfectiva(propia, tenant?.vertical ?? "", tipo);
  if (!pasos.length || !persona) return null;
  const base = dia(tipo === "ingreso" ? v.inicio : (v.termino ?? new Date()));
  const nombre = `${persona.nombres} ${persona.apellidos}`.trim();
  const resp = miembro?.userId ?? null;
  return ctx.transaccion(async (tx) => {
    const creada = await tx.procesoPersona.createManyAndReturn({
      data: [{ tenantId: ctx.tenantId, personaId: v.personaId, vinculoId, tipo }],
      skipDuplicates: true,
    });
    const proceso = creada[0];
    if (!proceso) return null;
    for (const [i, p] of pasos.entries()) {
      const vence = new Date(`${venceDe(base, p.plazoDias)}T00:00:00.000Z`);
      const tareaId = resp
        ? await crearTarea(ctx, tx, { titulo: tituloTarea(tipo, nombre, p.titulo), personaId: v.personaId, responsableId: resp, vence })
        : null;
      await tx.procesoPersonaPaso.create({
        data: {
          tenantId: ctx.tenantId, procesoId: proceso.id, orden: i + 1, titulo: p.titulo,
          responsableId: resp, vence, actividadId: tareaId,
        },
      });
    }
    await ctx.eventos.emitir(tx, {
      tipo: "core.persona.proceso_abierto",
      entidadTipo: "persona",
      entidadId: v.personaId,
      payload: { procesoId: proceso.id, tipo, pasos: pasos.length },
    });
    return proceso.id;
  });
}
