import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { movimientoSchema, montoDe } from "./esquemas";
import { PERMISO_BANCOS_VER } from "./permisos";
import { aIso } from "./util";

const estados = z.enum(["pendiente", "sugerido", "conciliado", "por_autorizar", "ignorado"]);

function reglaDe(explicacion: unknown): string | null {
  const r = (explicacion as { regla?: { nombre?: unknown } } | null)?.regla?.nombre;
  return typeof r === "string" ? r : null;
}

export const bancosMovimientosListar = defineCapability({
  id: "finanzas.movimientos_bancarios.listar",
  descripcion:
    "Lista movimientos bancarios de una cuenta, con filtro por estado de conciliación y por tipo (abonos o cargos), y dónde quedó conciliado cada uno.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({
    cuentaId: z.uuid(),
    estado: estados.optional(),
    /** «ingresos» = abonos (monto positivo); «egresos» = cargos (monto negativo). */
    tipo: z.enum(["ingresos", "egresos"]).optional(),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({ items: z.array(movimientoSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, input) {
    const items = await ctx.db.movimientoBancario.findMany({
      where: {
        cuentaId: input.cuentaId,
        ...(input.estado ? { estado: input.estado } : {}),
        ...(input.tipo === "ingresos" ? { monto: { gt: 0 } } : input.tipo === "egresos" ? { monto: { lt: 0 } } : {}),
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: input.limite,
      include: {
        conciliaciones: {
          where: { activa: true, confirmada: true },
          select: { tipoEnlace: true, enlaceId: true, explicacion: true },
        },
      },
    });
    const filaIds = items.flatMap((m) => m.conciliaciones.filter((c) => c.tipoEnlace === "flujo_fila").map((c) => c.enlaceId));
    const filas = filaIds.length
      ? await ctx.db.flujoFila.findMany({ where: { id: { in: filaIds } }, select: { id: true, etiqueta: true } })
      : [];
    const etiqueta = new Map(filas.map((f) => [f.id, f.etiqueta]));
    return {
      items: items.map((m) => {
        const c = m.conciliaciones;
        const fila = c.find((x) => x.tipoEnlace === "flujo_fila");
        const clasificacion = fila
          ? (etiqueta.get(fila.enlaceId) ?? null)
          : c.some((x) => x.tipoEnlace === "documento_emitido")
            ? "Facturas"
            : c.some((x) => x.tipoEnlace === "documento_recibido")
              ? "Compras"
              : null;
        return {
          id: m.id,
          cuentaId: m.cuentaId,
          fecha: aIso(m.fecha),
          monto: montoDe(m.monto),
          glosa: m.glosa,
          referencia: m.referencia,
          estado: m.estado as z.infer<typeof estados>,
          origen: m.origen,
          clasificacion,
          regla: fila ? reglaDe(fila.explicacion) : null,
        };
      }),
    };
  },
});
