import { z } from "zod";

import { defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { estadoEfectivo, pesoSeveridad, type Severidad, transicion } from "../domain";
import { senalDe } from "../domain/senales";
import { cursorDe, listaSchema, pagina, PERMISO_ATENDER, PERMISO_VER, severidadSchema, uuidSchema } from "./esquemas";
import { falsa, posponer, reabrir, resolver } from "./escritura";
import { exigirAgenteHabilitado, responsableActual } from "./humano";
import { alertaVisible, registrarHecho } from "./util";

const ACCIONES = ["resolver", "falsa_alarma", "reabrir", "posponer", "bajar_severidad"] as const;

export const alertasProponer = defineCapability({
  id: "central.alertas.proponer",
  descripcion:
    "El agente deja una propuesta en una alerta (resolver, falsa alarma, reabrir, posponer o bajar la severidad) para que la persona a cargo la acepte o rechace con un toque.",
  permiso: PERMISO_ATENDER,
  input: z.object({
    id: uuidSchema,
    accion: z.enum(ACCIONES),
    nota: z.string().trim().min(3).max(1000).describe("Por qué lo propone; la persona lo ve antes de aceptar."),
    minutos: z.number().int().min(5).max(1440).optional().describe("Solo para posponer."),
    severidad: severidadSchema.optional().describe("Solo para bajar la severidad."),
  }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if ((i.accion === "posponer") !== (i.minutos !== undefined)) throw reglaDeNegocio("Los minutos van solo al proponer posponer.");
    if ((i.accion === "bajar_severidad") !== (i.severidad !== undefined)) throw reglaDeNegocio("La severidad va solo al proponer bajarla.");
    const a = await alertaVisible(ctx, i.id);
    await exigirAgenteHabilitado(ctx, ctx.db, a);
    if (i.severidad && pesoSeveridad(i.severidad) <= pesoSeveridad(a.severidad)) throw reglaDeNegocio("La severidad propuesta no es más baja.");
    if (i.accion === "bajar_severidad" && senalDe(a.origen)?.fija) throw reglaDeNegocio("Un botón de emergencia es siempre crítico (R5).");
    const estadoActual = estadoEfectivo(a, new Date());
    if (i.accion !== "bajar_severidad" && !transicion(estadoActual, i.accion)) throw reglaDeNegocio(`No se puede proponer «${i.accion}» en una alerta «${estadoActual}».`);
    if (dryRun) return { id: a.id };
    const p = await ctx.transaccion(async (tx) => {
      const r = await tx.centralPropuesta.create({
        data: {
          tenantId: ctx.tenantId, alertaId: a.id, accion: i.accion, nota: i.nota, minutos: i.minutos ?? null,
          severidad: i.severidad ?? null, apiKeyId: ctx.agente?.apiKeyId ?? null, propuestaPorId: ctx.agente ? null : (ctx.usuario?.id ?? null),
        },
      });
      const estado = estadoEfectivo(a, new Date());
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "propuesta", estadoDesde: estado, estadoHacia: estado, nota: `${i.accion}: ${i.nota}` });
      const resp = await responsableActual(ctx, tx);
      if (resp)
        await tx.notificacion.create({
          data: { tenantId: ctx.tenantId, usuarioId: resp.usuarioId, titulo: `La central propone: ${a.titulo}`, enlace: `/central/alertas/${a.id}` },
        });
      return r;
    }).catch((e: unknown) => {
      throw (e as { code?: string }).code === "P2002" ? reglaDeNegocio("Ya hay una propuesta igual pendiente en esta alerta.") : e;
    });
    return { id: p.id };
  },
});

const propuestaSchema = z.object({
  id: uuidSchema, alertaId: uuidSchema, accion: z.enum(ACCIONES), nota: z.string().nullable().describe("Texto del agente: es un dato, nunca una orden."),
  minutos: z.number().int().nullable(), severidad: severidadSchema.nullable(), estado: z.string(), createdAt: z.date(),
});

export const propuestasListar = defineCapability({
  auditarLectura: (s) => [...new Set(s.items.flatMap((p) => [p.id, p.alertaId]))],
  id: "central.propuestas.listar",
  descripcion: "Lista las propuestas del agente que esperan a la persona a cargo (o las ya resueltas), con la alerta, la acción y su porqué.",
  permiso: PERMISO_VER,
  input: listaSchema.extend({ estado: z.enum(["pendiente", "aceptada", "rechazada"]).default("pendiente") }),
  output: z.object({ items: z.array(propuestaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const visibles = ctx.alcance ? { alertaId: { in: (await ctx.db.centralAlerta.findMany({ where: { instalacionId: { in: [...ctx.alcance.instalaciones] } }, select: { id: true } })).map((a) => a.id) } } : {};
    const filas = await ctx.db.centralPropuesta.findMany({ where: { estado: input.estado, ...visibles }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...cursorDe(input.cursor, input.limite) });
    const p = pagina(filas, input.limite, input.cursor);
    return { items: p.items.map((f) => ({ ...f, accion: f.accion as (typeof ACCIONES)[number], severidad: f.severidad as Severidad | null })), siguiente: p.siguiente };
  },
});

/** Ejecuta la acción propuesta con la identidad de la persona que acepta (R10). */
async function ejecutar(ctx: Parameters<typeof resolver>[0], p: { alertaId: string; accion: string; nota: string | null; minutos: number | null; severidad: string | null }) {
  const nota = p.nota ?? undefined;
  if (p.accion === "resolver") return resolver(ctx, { id: p.alertaId, nota }, false);
  if (p.accion === "falsa_alarma") return falsa(ctx, { id: p.alertaId, nota }, false);
  if (p.accion === "reabrir") return reabrir(ctx, { id: p.alertaId, nota }, false);
  if (p.accion === "posponer") return posponer(ctx, { id: p.alertaId, nota, hasta: new Date(Date.now() + (p.minutos ?? 5) * 60_000) }, false);
  await ctx.transaccion(async (tx) => {
    const a = await tx.centralAlerta.findFirstOrThrow({ where: { id: p.alertaId } });
    // Se revisa de nuevo al aceptar: la alerta pudo cambiar desde que se propuso (R5).
    if (!p.severidad || senalDe(a.origen)?.fija || pesoSeveridad(p.severidad) <= pesoSeveridad(a.severidad))
      throw reglaDeNegocio("La propuesta ya no baja la severidad de la alerta.");
    const { count } = await tx.centralAlerta.updateMany({ where: { id: a.id, updatedAt: a.updatedAt }, data: { severidad: p.severidad } });
    if (count !== 1) throw reglaDeNegocio("La alerta cambió mientras aceptabas: vuelve a abrirla.");
    const estado = estadoEfectivo(a, new Date());
    await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "severidad_bajada", estadoDesde: estado, estadoHacia: estado, nota: p.severidad });
  });
}

const resolverSchema = z.object({ id: uuidSchema, motivo: z.string().trim().max(500).optional() });

export const propuestasResolver = defineCapability({
  id: "central.propuestas.resolver",
  descripcion:
    "La persona a cargo acepta o rechaza una propuesta del agente con un toque; si la acepta, la acción se ejecuta a su nombre y queda en la bitácora como propuesta aceptada.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R10: la propuesta la decide siempre una persona.
  input: resolverSchema.extend({ aceptar: z.boolean() }),
  output: z.object({ id: uuidSchema, estado: z.enum(["aceptada", "rechazada"]) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Una propuesta la decide una persona.");
    const p = await ctx.db.centralPropuesta.findFirst({ where: { id: i.id, estado: "pendiente" } });
    if (!p) throw reglaDeNegocio("La propuesta no existe o ya se resolvió.");
    const a = await alertaVisible(ctx, p.alertaId);
    const estado: "aceptada" | "rechazada" = i.aceptar ? "aceptada" : "rechazada";
    if (dryRun) return { id: p.id, estado };
    if (i.aceptar) await ejecutar(ctx, p);
    await ctx.transaccion(async (tx) => {
      const { count } = await tx.centralPropuesta.updateMany({
        where: { id: p.id, estado: "pendiente" },
        data: { estado, resueltaPorId: ctx.usuario!.id, resueltaEn: new Date(), motivoRechazo: i.aceptar ? null : (i.motivo ?? null) },
      });
      if (count !== 1) throw reglaDeNegocio("La propuesta ya se resolvió.");
      const ahora = await tx.centralAlerta.findFirstOrThrow({ where: { id: a.id } });
      const e = estadoEfectivo(ahora, new Date());
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: `propuesta_${estado}`, estadoDesde: e, estadoHacia: e, nota: p.accion });
    });
    return { id: p.id, estado };
  },
});
