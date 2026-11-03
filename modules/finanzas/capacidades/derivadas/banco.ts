import type { Contexto } from "@opai/capabilities";
import { celdasRealesDesdeMovimientos, finSemanaIso } from "@opai/domain";

import { aNumeroSeguro } from "../esquemas";
import type { celdaSchema } from "../esquemas";
import { aFecha, aIso } from "../util";
import type { z } from "zod";

import { montoDe } from "../bancos/esquemas";
import { FILA_SIN_CLASIFICAR_EGRESO, FILA_SIN_CLASIFICAR_INGRESO } from "../filas-virtuales";

/**
 * Capa real del flujo: TODA la cartola del rango (CAR-97, CAR-181). Una sola consulta por rango,
 * sin importar cuántas semanas abarque. Entre `semana` y el fin de `hastaSemana` (o de `semana`).
 */
export async function derivadasBanco(
  ctx: Contexto,
  semana?: string,
  hastaSemana?: string,
): Promise<z.infer<typeof celdaSchema>[]> {
  const finSemana = semana ? finSemanaIso(hastaSemana ?? semana) : undefined;
  const movs = await ctx.db.movimientoBancario.findMany({
    where: {
      estado: { not: "ignorado" },
      ...(semana ? { fecha: { gte: aFecha(semana), lte: aFecha(finSemana!) } } : {}),
    },
    include: { conciliaciones: { where: { activa: true, confirmada: true } } },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
  });

  const docIds = [
    ...new Set(
      movs.flatMap((m) =>
        m.conciliaciones.filter((c) => c.tipoEnlace === "documento_emitido").map((c) => c.enlaceId),
      ),
    ),
  ];
  const docs =
    docIds.length > 0
      ? await ctx.db.documentoEmitido.findMany({
          where: { id: { in: docIds } },
          select: { id: true, cuentaId: true },
        })
      : [];
  const cuentaIds = [...new Set(docs.map((d) => d.cuentaId))];
  const cuentas =
    cuentaIds.length > 0
      ? await ctx.db.cuenta.findMany({ where: { id: { in: cuentaIds } }, select: { id: true, nombre: true } })
      : [];
  const nombreCuenta = new Map(cuentas.map((c) => [c.id, c.nombre] as const));
  const filaPorDoc = new Map<string, string>();
  for (const d of docs) {
    filaPorDoc.set(d.id, nombreCuenta.get(d.cuentaId) ?? "");
  }

  // Solo filas activas: lo real nunca cae en una fila archivada que la planilla no suma (hallazgo 4).
  const filas = await ctx.db.flujoFila.findMany({
    where: { activa: true },
    select: { id: true, etiqueta: true, seccion: true },
  });
  const porEtiqueta = new Map(filas.map((f) => [f.etiqueta.toLowerCase(), f]));
  const porId = new Map(filas.map((f) => [f.id, f.etiqueta]));

  const mapped = movs.map((m) => {
    const conciliado = m.estado === "conciliado";
    let filaCliente: string | null = null;
    const enlaceFila = m.conciliaciones.find((c) => c.tipoEnlace === "flujo_fila");
    if (enlaceFila) filaCliente = porId.get(enlaceFila.enlaceId) ?? null;

    const cobrosFactura = m.conciliaciones
      .filter((c) => c.tipoEnlace === "documento_emitido")
      .map((c) => ({
        filaEtiqueta: filaPorDoc.get(c.enlaceId) ?? "",
        monto: montoDe(c.monto),
      }));

    const base = {
      id: m.id,
      fecha: aIso(m.fecha),
      monto: aNumeroSeguro(m.monto),
      glosa: m.glosa,
      conciliado,
      filaCliente,
      esFactoringMerma: /MERMA|FACTORING/i.test(m.glosa),
      esRemuneracion: /REMUNERACI|PREVIRED/i.test(m.glosa),
      esPagoProveedor: m.conciliaciones.some((c) => c.tipoEnlace === "documento_recibido"),
    };
    return cobrosFactura.length > 0 ? { ...base, cobrosFactura } : base;
  });

  const celdas = celdasRealesDesdeMovimientos(mapped);
  const signoDe = new Map(movs.map((m) => [m.id, aNumeroSeguro(m.monto) >= 0 ? 1 : -1] as const));
  const out: z.infer<typeof celdaSchema>[] = [];

  for (const c of celdas) {
    const fila = porEtiqueta.get(c.filaEtiqueta.toLowerCase());
    const ingreso = (signoDe.get(c.movimientoId) ?? 1) > 0;
    // La fila debe ser de la sección del signo; si no existe o no calza, va a «Sin clasificar».
    const filaId =
      fila && (fila.seccion === "ingreso") === ingreso
        ? fila.id
        : ingreso
          ? FILA_SIN_CLASIFICAR_INGRESO
          : FILA_SIN_CLASIFICAR_EGRESO;
    out.push({
      id: c.movimientoId,
      filaId,
      semana: c.semana,
      capa: "real" as const,
      monto: c.monto,
      nota: c.nota,
    });
  }
  return out;
}
