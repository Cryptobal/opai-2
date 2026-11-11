// Reversión de un lote: borra lo que creó y restaura los valores previos de lo que completó. Se niega
// entero si algún registro se modificó después o ya tiene dependientes, y dice cuáles.
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { deJson } from "./aplicar";
import { exigirAcceso } from "./plan";
import { importadorDe } from "./registro";
import { VERSION_MOTOR } from "./tipos";

export type Bloqueada = { registro: string; motivo: string };
export type ResultadoReversion = { revertido: boolean; aBorrar: number; aRestaurar: number; bloqueadas: Bloqueada[] };

const TOLERANCIA_MS = 2000;

export async function revertirLote(ctx: Contexto, importacionId: string, dryRun: boolean): Promise<ResultadoReversion> {
  return ctx.transaccion(async (tx) => {
    const corrida = await tx.importacion.findFirst({ where: { id: importacionId, versionContrato: VERSION_MOTOR } });
    if (!corrida) throw noEncontrado("El lote de importación");
    if (corrida.estado === "revertida") throw reglaDeNegocio("Este lote ya fue revertido.");
    if (corrida.estado !== "completada" || !corrida.terminadaEn) throw reglaDeNegocio("Solo se puede revertir un lote completado.");
    const imp = importadorDe(String((corrida.conteos as { importador?: unknown } | null)?.importador ?? ""));
    exigirAcceso(ctx, imp);
    const limite = corrida.terminadaEn.getTime() + TOLERANCIA_MS;
    const filas = await tx.importacionFila.findMany({ where: { importacionId, accion: { in: ["creado", "completado", "sin_cambio"] } } });
    const creadas = filas.filter((f) => f.accion === "creado" && f.id20);
    const completadas = filas.filter((f) => f.accion === "completado" && f.id20);
    const bloqueadas: Bloqueada[] = [];
    for (const f of [...creadas, ...completadas]) {
      const id = f.id20 ?? "";
      const actual = await imp.actual(tx, id);
      if (!actual) continue;
      const nombre = String(actual["nombre"] ?? actual["titulo"] ?? actual["nombres"] ?? id);
      if (actual.updatedAt.getTime() > limite) bloqueadas.push({ registro: nombre, motivo: "se modificó después de la importación" });
      else if (f.accion === "creado") {
        const motivo = await imp.bloqueoAlBorrar(tx, id);
        if (motivo) bloqueadas.push({ registro: nombre, motivo });
      }
    }
    const resumen = { aBorrar: creadas.length, aRestaurar: completadas.length };
    if (dryRun || bloqueadas.length > 0) return { revertido: false, ...resumen, bloqueadas: bloqueadas.slice(0, 100) };
    for (const f of completadas) {
      const previos = Object.entries((f.previos ?? {}) as Record<string, unknown>).filter(([k]) => !k.startsWith("_"));
      if (previos.length && (await imp.actual(tx, f.id20 ?? "")))
        await imp.actualizar(tx, f.id20 ?? "", Object.fromEntries(previos.map(([k, v]) => [k, deJson(v)])));
    }
    const vinculos = filas.filter((f) => f.id20 && (f.accion === "creado" || (f.previos as { _vinculoNuevo?: unknown } | null)?._vinculoNuevo === true));
    if (vinculos.length)
      await tx.idExterno.deleteMany({
        where: { sistema: corrida.sistema, entidadTipo: imp.entidad, entidadId: { in: vinculos.map((f) => f.id20 ?? "") } },
      });
    for (const f of creadas) if (await imp.actual(tx, f.id20 ?? "")) await imp.borrar(tx, f.id20 ?? "");
    await tx.importacion.update({ where: { id: importacionId }, data: { estado: "revertida", revertidaEn: new Date() } });
    await ctx.eventos.emitir(tx, {
      tipo: "core.importacion.revertida",
      entidadTipo: "importacion",
      entidadId: importacionId,
      payload: { importador: imp.def.id, borrados: creadas.length, restaurados: completadas.length },
    });
    return { revertido: true, ...resumen, bloqueadas: [] };
  });
}
