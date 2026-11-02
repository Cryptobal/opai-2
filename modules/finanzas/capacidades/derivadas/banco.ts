import type { Contexto } from "@opai/capabilities";
import { celdasRealesDesdeMovimientos } from "@opai/domain";

import { aNumeroSeguro } from "../esquemas";
import type { celdaSchema } from "../esquemas";
import { aIso } from "../util";
import type { z } from "zod";

/** Capa real del flujo desde movimientos bancarios conciliados (CAR-97). */
export async function derivadasBanco(ctx: Contexto, semana?: string): Promise<z.infer<typeof celdaSchema>[]> {
  const movs = await ctx.db.movimientoBancario.findMany({
    where: { estado: { in: ["conciliado", "pendiente", "sugerido", "por_autorizar"] } },
    include: { conciliaciones: { where: { activa: true, confirmada: true } } },
    take: 1000,
  });

  const filas = await ctx.db.flujoFila.findMany({ select: { id: true, etiqueta: true } });
  const porEtiqueta = new Map(filas.map((f) => [f.etiqueta.toLowerCase(), f.id]));
  const porId = new Map(filas.map((f) => [f.id, f.etiqueta]));

  const mapped = movs.map((m) => {
    const conciliado = m.estado === "conciliado";
    let filaCliente: string | null = null;
    const enlaceFila = m.conciliaciones.find((c) => c.tipoEnlace === "flujo_fila");
    if (enlaceFila) filaCliente = porId.get(enlaceFila.enlaceId) ?? null;
    return {
      id: m.id,
      fecha: aIso(m.fecha),
      monto: aNumeroSeguro(m.monto),
      glosa: m.glosa,
      conciliado,
      filaCliente,
      esFactoringMerma: /MERMA|FACTORING/i.test(m.glosa),
      esRemuneracion: m.estado === "por_autorizar" || /REMUNERACI|PREVIRED/i.test(m.glosa),
    };
  });

  const celdas = celdasRealesDesdeMovimientos(mapped);
  const filtradas = semana ? celdas.filter((c) => c.semana === semana) : celdas;

  return filtradas.flatMap((c) => {
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
