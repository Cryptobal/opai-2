import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import { reglaCalza } from "@opai/domain";

import { montoDe } from "./esquemas";
import { PERMISO_BANCOS_GESTIONAR, PERMISO_BANCOS_VER } from "./permisos";
import { aplicarReglasBanco } from "./reglas-aplicar";
import { definicionReglaSchema } from "./reglas-esquemas";
import { aIso, cuentaDe } from "./util";

const VENTANA_DIAS = 120;

export const bancosReglasProbar = defineCapability({
  id: "finanzas.reglas_banco.probar",
  descripcion:
    "Muestra qué movimientos de los últimos 120 días calzarían con una regla del banco antes de guardarla, sin cambiar nada.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({ modo: z.enum(["todas", "alguna"]).default("todas"), definicion: definicionReglaSchema }),
  output: z.object({
    total: z.number().int(),
    sinConciliar: z.number().int(),
    ejemplos: z.array(z.object({ id: z.string(), fecha: z.string(), glosa: z.string(), monto: z.number().int() })),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.ejemplos.map((e) => e.id),
  async handler(ctx, input) {
    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - VENTANA_DIAS);
    const movs = await ctx.db.movimientoBancario.findMany({
      where: { fecha: { gte: desde } },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 2000,
      select: { id: true, fecha: true, glosa: true, referencia: true, monto: true, estado: true },
    });
    const regla = { ...input.definicion, modo: input.modo, activa: true, id: "", nombre: "", prioridad: 0, flujoFilaId: null };
    const calzan = movs.filter((m) => reglaCalza(regla, { monto: montoDe(m.monto), glosa: m.glosa, referencia: m.referencia }));
    return {
      total: calzan.length,
      sinConciliar: calzan.filter((m) => m.estado === "pendiente" || m.estado === "sugerido").length,
      ejemplos: calzan.slice(0, 8).map((m) => ({ id: m.id, fecha: aIso(m.fecha), glosa: m.glosa, monto: montoDe(m.monto) })),
    };
  },
});

export const bancosReglasAplicar = defineCapability({
  id: "finanzas.reglas_banco.aplicar",
  descripcion:
    "Vuelve a evaluar las reglas del banco sobre los movimientos sin reconocer de una cuenta: concilia solo con monto y referencia exactos y deja el resto como sugerencia.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({ cuentaId: z.uuid() }),
  output: z.object({ conciliados: z.number().int(), sugeridos: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cuentaDe(ctx, input.cuentaId);
    // La vista previa evalúa igual pero sin escribir: cuenta lo que conciliaría y lo que dejaría sugerido.
    if (dryRun) return ctx.transaccion((tx) => aplicarReglasBanco(ctx, tx, { cuentaId: input.cuentaId, simular: true }));
    return ctx.transaccion((tx) => aplicarReglasBanco(ctx, tx, { cuentaId: input.cuentaId }));
  },
});
