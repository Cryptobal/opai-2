import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { calcularPlanilla, evaluarCierre, semanasDesde } from "../domain";
import { saldoSchema, semanaSchema } from "./esquemas";
import { PERMISO_CERRAR, PERMISO_VER } from "./permisos";
import { aFecha, ajustesDe, aIso, cargarFlujo } from "./util";

const cierreSchema = z.object({
  semana: semanaSchema,
  saldoSugerido: saldoSchema,
  saldoBanco: saldoSchema,
  diferencia: saldoSchema,
  motivo: z.string().nullable(),
  sellada: z.boolean(),
});

type FilaCierre = {
  semana: Date | string;
  saldoSugerido: number;
  saldoBanco: number;
  motivo: string | null;
  sellada: boolean;
};
const vista = (c: FilaCierre) => ({
  semana: aIso(c.semana),
  saldoSugerido: c.saldoSugerido,
  saldoBanco: c.saldoBanco,
  diferencia: c.saldoBanco - c.saldoSugerido,
  motivo: c.motivo,
  sellada: c.sellada,
});

export const cierresListar = defineCapability({
  id: "finanzas.cierres.listar",
  descripcion:
    "Lista los cierres semanales del flujo de caja: saldo sugerido, saldo del banco, diferencia, motivo y si la semana sigue sellada.",
  permiso: PERMISO_VER,
  input: z.object({}),
  output: z.array(cierreSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    return (await ctx.db.flujoCierre.findMany({ orderBy: { semana: "desc" } })).map(vista);
  },
});

export const cierreSellar = defineCapability({
  id: "finanzas.cierres.sellar",
  descripcion:
    "Sella una semana del flujo de caja contra el saldo del banco: calcula el saldo sugerido, exige motivo si la diferencia supera la tolerancia y bloquea cambios en esa semana.",
  permiso: PERMISO_CERRAR,
  input: z.object({
    semana: semanaSchema,
    saldoBanco: saldoSchema,
    motivo: z.string().trim().min(3).max(500).optional(),
  }),
  output: cierreSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Se necesita una sesión de usuario para sellar una semana.");
    const ajustes = await ajustesDe(ctx);
    if (input.semana < ajustes.desde)
      throw reglaDeNegocio("La semana es anterior al inicio del flujo.");
    const previo = await ctx.db.flujoCierre.findFirst({ where: { semana: aFecha(input.semana) } });
    if (previo?.sellada) throw conflicto("La semana ya está sellada.");
    const semanas = semanasDesde(
      ajustes.desde,
      Math.round((Date.parse(input.semana) - Date.parse(ajustes.desde)) / (7 * 86_400_000)) + 1,
    );
    const { dominio, celdasDom } = await cargarFlujo(ctx, ajustes.desde, input.semana);
    const sugerido =
      calcularPlanilla({
        saldoInicial: ajustes.saldoInicial,
        umbral: ajustes.umbral,
        semanas,
        filas: dominio,
        celdas: celdasDom,
      }).at(-1)?.saldoFinal ?? ajustes.saldoInicial;
    const { exigeMotivo } = evaluarCierre(sugerido, input.saldoBanco);
    if (exigeMotivo && !input.motivo)
      throw reglaDeNegocio("La diferencia con el banco supera la tolerancia: indica el motivo.");
    const data = {
      saldoSugerido: sugerido,
      saldoBanco: input.saldoBanco,
      motivo: input.motivo ?? null,
      sellada: true,
    };
    if (dryRun) return vista({ semana: input.semana, ...data });
    const c = await ctx.transaccion(async (tx) => {
      const sello = {
        ...data,
        selladaEn: new Date(),
        selladaPorId: ctx.usuario?.id ?? null,
        motivoReapertura: null,
      };
      const r = previo
        ? await tx.flujoCierre.update({ where: { id: previo.id }, data: sello })
        : await tx.flujoCierre.create({
            data: { ...sello, tenantId: ctx.tenantId, semana: aFecha(input.semana) },
          });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.semana_sellada",
        entidadTipo: "flujoCierre",
        entidadId: r.id,
      });
      return r;
    });
    return vista(c);
  },
});

export const cierreReabrir = defineCapability({
  id: "finanzas.cierres.reabrir",
  descripcion:
    "Reabre una semana sellada del flujo de caja con su motivo obligatorio; queda en la auditoría y la semana vuelve a admitir cambios.",
  permiso: PERMISO_CERRAR,
  input: z.object({ semana: semanaSchema, motivo: z.string().trim().min(3).max(500) }),
  output: cierreSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await ctx.db.flujoCierre.findFirst({ where: { semana: aFecha(input.semana) } });
    if (!c?.sellada) throw reglaDeNegocio("La semana no está sellada.");
    if (dryRun) return vista({ ...c, sellada: false });
    const r = await ctx.transaccion(async (tx) => {
      const u = await tx.flujoCierre.update({
        where: { id: c.id },
        data: { sellada: false, motivoReapertura: input.motivo },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.semana_reabierta",
        entidadTipo: "flujoCierre",
        entidadId: c.id,
      });
      return u;
    });
    return vista(r);
  },
});
