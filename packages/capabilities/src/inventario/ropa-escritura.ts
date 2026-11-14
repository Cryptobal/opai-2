import { existenciaResultante, LIMITES_ROPA, lineasDeIngreso, normalizarTalla } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISOS_INVENTARIO } from "./comun";
import { aplicarMovimiento } from "./ropa-movimiento";

const notaSchema = z.string().trim().max(LIMITES_ROPA.notaMax);
const resultadoSchema = z.object({
  tipoId: z.string(),
  existencias: z.array(z.object({ talla: z.string(), cantidad: z.number().int() })),
});

async function tipoDeRopa(ctx: Contexto, tipoId: string) {
  const tipo = await ctx.db.inventarioTipo.findFirst({ where: { id: tipoId } });
  if (!tipo) throw noEncontrado("El tipo de ropa");
  if (tipo.categoria !== "ropa") throw reglaDeNegocio("Los activos se registran uno por uno, no por existencias.");
  return tipo;
}

async function cantidadActual(ctx: Contexto, tipoId: string, talla: string) {
  const e = await ctx.db.inventarioExistencia.findFirst({ where: { tipoId, talla }, select: { cantidad: true } });
  return e?.cantidad ?? 0;
}

export const ropaIngresar = defineCapability({
  id: "inventario.ropa.ingresar",
  descripcion:
    "Registra un ingreso de ropa (por ejemplo, una compra): suma unidades a una o varias tallas de un tipo de ropa, con una nota opcional como el número de la factura.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    tipoId: uuidSchema,
    lineas: z
      .array(z.object({ talla: z.string().trim().min(1).max(10), cantidad: z.number().int().min(1).max(LIMITES_ROPA.cantidadMax) }))
      .min(1)
      .max(20),
    nota: notaSchema.optional(),
  }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const tipo = await tipoDeRopa(ctx, input.tipoId);
    if (!tipo.activo) throw reglaDeNegocio("El tipo está desactivado: actívalo para registrar ingresos.");
    const r = lineasDeIngreso(tipo.tallas, input.lineas);
    if (!r.ok) throw reglaDeNegocio(r.error);
    const previas = await Promise.all(r.lineas.map((l) => cantidadActual(ctx, tipo.id, l.talla)));
    const proyectadas = r.lineas.map((l, i) => ({ talla: l.talla, cantidad: existenciaResultante(previas[i] ?? 0, l.cantidad) }));
    if (proyectadas.some((p) => p.cantidad === null)) throw reglaDeNegocio("Una talla superaría el máximo de unidades.");
    if (dryRun) return { tipoId: tipo.id, existencias: proyectadas.map((p) => ({ talla: p.talla, cantidad: p.cantidad ?? 0 })) };
    const existencias = await ctx.transaccion(async (tx) => {
      const nuevas = [];
      for (const l of r.lineas) {
        const nota = input.nota || null;
        const cantidad = await aplicarMovimiento(ctx, tx, { tipoId: tipo.id, talla: l.talla, delta: l.cantidad, motivo: "ingreso", nota });
        nuevas.push({ talla: l.talla, cantidad });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.ropa.ingresada",
        entidadTipo: "inventario_tipo",
        entidadId: tipo.id,
        payload: { unidades: r.lineas.reduce((s, l) => s + l.cantidad, 0) },
      });
      return nuevas;
    });
    return { tipoId: tipo.id, existencias };
  },
});

export const ropaAjustar = defineCapability({
  id: "inventario.ropa.ajustar",
  descripcion:
    "Corrige la cantidad de una talla de ropa tras un conteo (por ejemplo, faltantes o prendas dañadas): fija la cantidad real y deja el ajuste con su motivo en el historial.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    tipoId: uuidSchema,
    talla: z.string().trim().min(1).max(10),
    cantidad: z.number().int().min(0).max(LIMITES_ROPA.cantidadMax).describe("Cantidad real contada."),
    motivo: z.string().trim().min(3).max(LIMITES_ROPA.notaMax),
  }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const tipo = await tipoDeRopa(ctx, input.tipoId);
    const talla = normalizarTalla(input.talla);
    const actual = await cantidadActual(ctx, tipo.id, talla);
    if (!tipo.tallas.includes(talla) && actual === 0) throw reglaDeNegocio(`La talla «${input.talla}» no es de este tipo.`);
    const delta = input.cantidad - actual;
    if (delta === 0) throw reglaDeNegocio("La cantidad ya es esa: no hay nada que ajustar.");
    if (dryRun) return { tipoId: tipo.id, existencias: [{ talla, cantidad: input.cantidad }] };
    const cantidad = await ctx.transaccion(async (tx) => {
      const c = await aplicarMovimiento(ctx, tx, { tipoId: tipo.id, talla, delta, motivo: "ajuste", nota: input.motivo });
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.ropa.ajustada",
        entidadTipo: "inventario_tipo",
        entidadId: tipo.id,
        payload: { talla, delta },
      });
      return c;
    });
    return { tipoId: tipo.id, existencias: [{ talla, cantidad }] };
  },
});
