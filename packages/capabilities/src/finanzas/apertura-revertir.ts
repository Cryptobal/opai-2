// Reversión de una corrida de apertura: borra lo que creó y devuelve el folio. Se niega entera si
// algo se tocó después (cobros, gestiones, conciliaciones, cesiones, folios emitidos).
import { conflicto, noEncontrado } from "../errores";
import type { Contexto } from "../types";

type Bloqueo = { entidad: string; id10: string; motivo: string };

export async function revertirApertura(ctx: Contexto, importacionId: string, dryRun: boolean) {
  return ctx.transaccion(async (tx) => {
    const c = await tx.importacion.findFirst({ where: { id: importacionId, versionContrato: "finanzas-apertura@1" } });
    if (!c) throw noEncontrado("La corrida de apertura");
    if (c.estado === "revertida") throw conflicto("La corrida ya fue revertida.");
    if (c.estado !== "completada" || !c.terminadaEn) throw conflicto("Solo se puede revertir una corrida completada.");
    const filas = await tx.importacionFila.findMany({ where: { importacionId, accion: "creado" } });
    const bloqueos: Bloqueo[] = [];
    const b = (f: { entidad: string; id10: string }, motivo: string) => bloqueos.push({ entidad: f.entidad, id10: f.id10, motivo });
    for (const f of filas) {
      if (!f.id20) continue;
      if (f.entidad === "documento_cobrar") {
        const d = await tx.documentoEmitido.findFirst({
          where: { id: f.id20 },
          select: { updatedAt: true, _count: { select: { gestionesCobranza: true, cesiones: true, enviosSii: true } } },
        });
        if (!d) continue;
        const n = d._count;
        if (d.updatedAt > c.terminadaEn) b(f, "modificado_despues");
        else if (n.gestionesCobranza + n.cesiones + n.enviosSii > 0) b(f, "tiene_dependientes");
        else if ((await tx.conciliacionBanco.count({ where: { enlaceId: f.id20, activa: true } })) > 0) b(f, "conciliado");
      } else if (f.entidad === "saldo_banco") {
        const base = await tx.movimientoBancario.findFirst({ where: { id: f.id20 }, select: { cuentaId: true } });
        if ((await tx.conciliacionBanco.count({ where: { movimientoId: f.id20, activa: true } })) > 0) b(f, "conciliado");
        else if (base && (await tx.movimientoBancario.count({ where: { cuentaId: base.cuentaId, id: { not: f.id20 }, createdAt: { gt: c.terminadaEn } } })) > 0)
          b(f, "hay_movimientos_posteriores");
      } else if (f.entidad === "folio") {
        const fo = await tx.dteFolio.findFirst({ where: { id: f.id20 }, select: { updatedAt: true } });
        if (fo && fo.updatedAt > c.terminadaEn) b(f, "folio_usado_despues");
      }
    }
    const resumen = { filas: filas.length };
    if (dryRun || bloqueos.length > 0) return { revertida: false, ...resumen, bloqueos };
    for (const f of filas) {
      if (!f.id20) continue;
      if (f.entidad === "documento_cobrar") {
        await tx.documentoEmitidoLinea.deleteMany({ where: { documentoId: f.id20 } });
        await tx.documentoEmitidoReferencia.deleteMany({ where: { documentoId: f.id20 } });
        await tx.documentoEmitido.delete({ where: { id: f.id20 } });
      } else if (f.entidad === "saldo_banco") await tx.movimientoBancario.delete({ where: { id: f.id20 } });
      else if (f.entidad === "folio") {
        const previo = (f.previos as { folioActual?: number } | null)?.folioActual;
        if (typeof previo === "number") await tx.dteFolio.update({ where: { id: f.id20 }, data: { folioActual: previo } });
      }
    }
    await tx.importacion.update({ where: { id: importacionId }, data: { estado: "revertida", revertidaEn: new Date() } });
    return { revertida: true, ...resumen, bloqueos };
  });
}
