import type { Contexto } from "@opai/capabilities";
import { celdasRealesDesdeMovimientos, finSemanaIso } from "@opai/domain";

import { aNumeroSeguro } from "../esquemas";
import type { celdaSchema } from "../esquemas";
import { aFecha, aIso } from "../util";
import type { z } from "zod";

import { montoDe } from "../bancos/esquemas";

/** Capa real del flujo desde movimientos bancarios conciliados (CAR-97). */
export async function derivadasBanco(ctx: Contexto, semana?: string): Promise<z.infer<typeof celdaSchema>[]> {
  const finSemana = semana ? finSemanaIso(semana) : undefined;
  const movs = await ctx.db.movimientoBancario.findMany({
    where: {
      estado: { in: ["conciliado", "pendiente", "sugerido", "por_autorizar"] },
      ...(semana
        ? { fecha: { gte: aFecha(semana), lte: aFecha(finSemana!) } }
        : {}),
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
    const nombre = nombreCuenta.get(d.cuentaId);
    if (nombre) filaPorDoc.set(d.id, nombre);
  }

  const filas = await ctx.db.flujoFila.findMany({ select: { id: true, etiqueta: true } });
  const porEtiqueta = new Map(filas.map((f) => [f.etiqueta.toLowerCase(), f.id]));
  const porId = new Map(filas.map((f) => [f.id, f.etiqueta]));

  const mapped = movs.map((m) => {
    const conciliado = m.estado === "conciliado";
    let filaCliente: string | null = null;
    const enlaceFila = m.conciliaciones.find((c) => c.tipoEnlace === "flujo_fila");
    if (enlaceFila) filaCliente = porId.get(enlaceFila.enlaceId) ?? null;

    const cobrosFactura = m.conciliaciones
      .filter((c) => c.tipoEnlace === "documento_emitido")
      .flatMap((c) => {
        const filaEtiqueta = filaPorDoc.get(c.enlaceId);
        return filaEtiqueta ? [{ filaEtiqueta, monto: montoDe(c.monto) }] : [];
      });

    const base = {
      id: m.id,
      fecha: aIso(m.fecha),
      monto: aNumeroSeguro(m.monto),
      glosa: m.glosa,
      conciliado,
      filaCliente,
      esFactoringMerma: /MERMA|FACTORING/i.test(m.glosa),
      esRemuneracion: m.estado === "por_autorizar" || /REMUNERACI|PREVIRED/i.test(m.glosa),
    };
    return cobrosFactura.length > 0 ? { ...base, cobrosFactura } : base;
  });

  const celdas = celdasRealesDesdeMovimientos(mapped);

  return celdas.flatMap((c) => {
    const filaId = porEtiqueta.get(c.filaEtiqueta.toLowerCase());
    if (!filaId) return [];
    return [
      {
        id: c.movimientoId,
        filaId,
        semana: c.semana,
        capa: "real" as const,
        monto: c.monto,
        nota: c.nota,
      },
    ];
  });
}
