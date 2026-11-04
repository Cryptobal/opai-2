import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_READ as PERMISO_ACTIVIDADES } from "../core/crm/actividades-comun";
import { filtrarVisibles } from "../core/crm/actividades-alcance";
import { hoy } from "../core/maestros/comun";
import { PERMISO_READ, embudoPorDefecto } from "./comun";
import { alertasDe, montoMensual } from "./informes-calculo";

const alertaSchema = z.enum(["sin_monto", "sin_fecha_cierre", "cierre_vencido", "sin_actividad"]);

const filaSchema = z.object({
  negocioId: z.string(),
  titulo: z.string(),
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  etapaNombre: z.string(),
  responsableNombre: z.string().nullable(),
  montoMensualClp: z.number().int(),
  cierreEstimado: z.string().nullable(),
  diasSinActividad: z.number().int().nullable(),
  alertas: z.array(alertaSchema).min(1),
});

export const negociosAlertas = defineCapability({
  id: "comercial.negocios.alertas",
  descripcion:
    "Negocios abiertos que requieren corrección o seguimiento: etapa avanzada sin monto o sin fecha de cierre, fecha de cierre vencida y días sin actividad registrada (por defecto 14). Ordenados por cantidad de alertas, para que un agente sepa qué pedir o corregir primero.",
  permiso: PERMISO_READ,
  input: z.object({
    diasSinActividad: z.number().int().min(1).max(365).default(14),
    responsableId: z.uuid().optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    hoy: z.string(),
    inactividadEvaluada: z
      .boolean()
      .describe("false si el actor no puede leer actividades: entonces no se evalúa sin_actividad."),
    total: z.number().int(),
    items: z.array(filaSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.flatMap((i) => [i.negocioId, i.cuentaId]),
  async handler(ctx, input) {
    const fecha = hoy();
    const embudo = await embudoPorDefecto(ctx);
    const [etapas, negocios] = await Promise.all([
      ctx.db.etapa.findMany({ where: { embudoId: embudo.id, activa: true } }),
      ctx.db.negocio.findMany({
        where: {
          embudoId: embudo.id,
          estado: "abierto",
          archivadoEn: null,
          ...(input.responsableId ? { responsableId: input.responsableId } : {}),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 500,
      }),
    ]);
    const leeActividades = ctx.autorizar(PERMISO_ACTIVIDADES);
    const ultima = new Map<string, string>();
    if (leeActividades && negocios.length) {
      const vinculos = await ctx.db.actividadVinculo.findMany({
        where: { negocioId: { in: negocios.map((n) => n.id) } },
        select: { negocioId: true, actividadId: true },
      });
      const visibles = new Set(await filtrarVisibles(ctx, vinculos.map((v) => v.actividadId)));
      const acts = await ctx.db.actividad.findMany({
        where: { id: { in: [...visibles] }, tipo: { not: "tarea" } },
        select: { id: true, ocurrioEn: true },
      });
      for (const v of vinculos) {
        const a = acts.find((x) => x.id === v.actividadId);
        const dia = a?.ocurrioEn.toISOString().slice(0, 10);
        if (v.negocioId && dia && dia <= fecha && dia > (ultima.get(v.negocioId) ?? "")) {
          ultima.set(v.negocioId, dia);
        }
      }
    }
    const evaluados = negocios.flatMap((n) => {
      const etapa = etapas.find((e) => e.id === n.etapaId);
      const r = alertasDe(
        {
          etapaExigeMonto: etapa?.exige.includes("monto") ?? false,
          etapaExigeCierre: etapa?.exige.includes("fecha_cierre") ?? false,
          monto: montoMensual(n),
          cierreEstimado: n.cierreEstimado?.toISOString().slice(0, 10) ?? null,
          ultimaActividad: ultima.get(n.id) ?? null,
          creadoEn: n.createdAt.toISOString(),
        },
        fecha,
        input.diasSinActividad,
        leeActividades,
      );
      return r.alertas.length ? [{ n, etapa, ...r }] : [];
    });
    evaluados.sort((a, b) => b.alertas.length - a.alertas.length);
    const pagina = evaluados.slice(0, input.limite);
    const cuentaIds = [...new Set(pagina.map((e) => e.n.cuentaId))];
    const userIds = [...new Set(pagina.flatMap((e) => (e.n.responsableId ? [e.n.responsableId] : [])))];
    const [cuentas, usuarios] = await Promise.all([
      ctx.db.cuenta.findMany({ where: { id: { in: cuentaIds } }, select: { id: true, nombre: true } }),
      userIds.length
        ? ctx.db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);
    return {
      hoy: fecha,
      inactividadEvaluada: leeActividades,
      total: evaluados.length,
      items: pagina.map(({ n, etapa, alertas, diasSinActividad }) => ({
        negocioId: n.id,
        titulo: n.titulo,
        cuentaId: n.cuentaId,
        cuentaNombre: cuentas.find((c) => c.id === n.cuentaId)?.nombre ?? "",
        etapaNombre: etapa?.nombre ?? "",
        responsableNombre: usuarios.find((u) => u.id === n.responsableId)?.name ?? null,
        montoMensualClp: montoMensual(n),
        cierreEstimado: n.cierreEstimado?.toISOString().slice(0, 10) ?? null,
        diasSinActividad,
        alertas,
      })),
    };
  },
});
