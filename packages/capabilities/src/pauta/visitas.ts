import { z } from "zod";

import { clasificarLlegada } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion } from "../core/maestros/alcance";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, prohibido } from "../errores";
import type { Contexto } from "../types";
import { listaVisitaDe } from "./ajustes";
import { PERMISO_WRITE } from "./comun";
import { dondeVisita, itemVisitaSchema, type Visita, visitaSchema, vistasDeVisitas } from "./visitas-comun";

function quien(ctx: Contexto): string {
  const id = ctx.usuario?.id;
  if (!id) throw prohibido("Una visita la registra una persona con usuario.");
  return id;
}

const lecturaSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  precisionM: z.number().min(0).max(100_000).optional(),
});

/** Inicia una visita (CAR-83, R1–R2): hora del servidor, ubicación opcional que nunca bloquea, una en curso por persona. */
export const visitasIniciar = defineCapability({
  id: "pauta.visitas.iniciar",
  descripcion:
    "Inicia una visita de supervisión a una instalación con la hora del servidor y, si se envía, la ubicación del celular: guarda la distancia a la instalación y si quedó dentro de su geocerca, sin bloquear nunca. Devuelve la lista de revisión de la empresa para llenarla al cerrar. Una sola visita en curso por persona.",
  permiso: PERMISO_WRITE,
  input: z.object({ instalacionId: uuidSchema, ubicacion: lecturaSchema.nullable().default(null) }),
  output: z.object({ visita: visitaSchema.nullable(), distanciaM: z.number().int().nullable(), geocerca: visitaSchema.shape.geocerca, lista: z.array(z.string()) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const supervisorId = quien(ctx);
    const inst = await ctx.db.instalacion.findFirst({
      where: { AND: [dondeInstalacion(ctx)], id: input.instalacionId, archivadaEn: null },
      select: { id: true, lat: true, lng: true, geocercaM: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    const abierta = await ctx.db.visitaSupervision.findFirst({ where: { supervisorId, estado: "en_curso" }, select: { id: true } });
    const yaAbierta = "Ya tienes una visita en curso: ciérrala antes de iniciar otra.";
    if (abierta) throw conflicto(yaAbierta);
    const u = input.ubicacion;
    const { distanciaM, geocerca } = clasificarLlegada({
      instalacion: { lat: inst.lat == null ? null : Number(inst.lat), lng: inst.lng == null ? null : Number(inst.lng), geocercaM: inst.geocercaM },
      lectura: u ? { lat: u.lat, lng: u.lng } : null,
    });
    const lista = await listaVisitaDe(ctx);
    if (dryRun) return { visita: null, distanciaM, geocerca, lista };
    // Dos «iniciar» a la vez: el índice parcial deja pasar uno y el otro sale como CONFLICT, no como error interno.
    const fila = await sinDuplicado(ctx.db.visitaSupervision.create({
      data: {
        tenantId: ctx.tenantId, instalacionId: inst.id, supervisorId, iniciadaEn: new Date(), geocerca, distanciaM,
        lat: u?.lat ?? null, lng: u?.lng ?? null, precisionM: u?.precisionM == null ? null : Math.round(u.precisionM),
      },
    }), yaAbierta);
    const [visita] = await vistasDeVisitas(ctx, [fila]);
    return { visita: visita as Visita, distanciaM, geocerca, lista };
  },
});

/** Cierra la visita propia con la lista de revisión y observaciones (CAR-83, R3). Cerrada no se edita. */
export const visitasCerrar = defineCapability({
  id: "pauta.visitas.cerrar",
  descripcion:
    "Cierra una visita de supervisión en curso con su lista de revisión (cada ítem cumple, no cumple o no aplica, con nota opcional) y observaciones. Solo la cierra quien la inició y, una vez cerrada, no se edita.",
  permiso: PERMISO_WRITE,
  input: z.object({
    visitaId: uuidSchema,
    checklist: z.array(itemVisitaSchema).max(30),
    observaciones: z.string().trim().max(2000).nullable().default(null),
  }),
  output: z.object({ visita: visitaSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const supervisorId = quien(ctx);
    const v = await ctx.db.visitaSupervision.findFirst({
      // Quien la inició puede cerrarla aunque haya perdido la instalación; si no, quedaría trabado sin poder iniciar otra.
      where: { id: input.visitaId, OR: [dondeVisita(ctx), { supervisorId }] },
    });
    if (!v) throw noEncontrado("La visita");
    if (v.supervisorId !== supervisorId) throw prohibido("Solo quien inició la visita puede cerrarla.");
    if (v.estado !== "en_curso") throw conflicto("La visita ya está cerrada.");
    const cambios = { estado: "cerrada", cerradaEn: new Date(), checklist: input.checklist, observaciones: input.observaciones || null };
    if (dryRun) return { visita: (await vistasDeVisitas(ctx, [{ ...v, ...cambios }]))[0] as Visita };
    const cerrada = await ctx.transaccion(async (tx) => {
      const r = await tx.visitaSupervision.updateMany({ where: { id: v.id, estado: "en_curso" }, data: cambios });
      if (r.count !== 1) throw conflicto("La visita cambió mientras tanto.");
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.visita.cerrada",
        entidadTipo: "visita",
        entidadId: v.id,
        payload: { instalacionId: v.instalacionId, noCumple: input.checklist.filter((i) => i.resultado === "no_cumple").length },
      });
      return tx.visitaSupervision.findUniqueOrThrow({ where: { id: v.id } });
    });
    return { visita: (await vistasDeVisitas(ctx, [cerrada]))[0] as Visita };
  },
});
