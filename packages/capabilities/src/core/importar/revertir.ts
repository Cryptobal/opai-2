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
const previosDe = (v: unknown) => (v && typeof v === "object" ? v : {}) as Record<string, unknown>;

export async function revertirLote(ctx: Contexto, importacionId: string, dryRun: boolean): Promise<ResultadoReversion> {
  return ctx.transaccion(async (tx) => {
    const corrida = await tx.importacion.findFirst({ where: { id: importacionId, versionContrato: VERSION_MOTOR } });
    if (!corrida) throw noEncontrado("El lote de importación");
    if (corrida.estado === "revertida") throw reglaDeNegocio("Este lote ya fue revertido.");
    if (corrida.estado !== "completada") throw reglaDeNegocio("Solo se puede revertir un lote completado.");
    const imp = importadorDe(String(previosDe(corrida.conteos)["importador"] ?? ""));
    exigirAcceso(ctx, imp);
    const filas = await tx.importacionFila.findMany({ where: { importacionId, accion: { in: ["creado", "completado", "sin_cambio"] }, id20: { not: null } } });
    const creadas = filas.filter((f) => f.accion === "creado");
    const completadas = filas.filter((f) => f.accion === "completado");
    const tocadas = [...creadas, ...completadas];
    const actuales = new Map((await imp.actuales(tx, tocadas.map((f) => f.id20 ?? ""))).map((a) => [a.id, a]));
    const conDependientes = await imp.bloqueos(tx, creadas.map((f) => f.id20 ?? ""));
    const bloqueadas: Bloqueada[] = [];
    for (const f of tocadas) {
      const actual = actuales.get(f.id20 ?? "");
      if (!actual) continue;
      const nombre = String(actual["nombre"] ?? actual["titulo"] ?? actual["nombres"] ?? actual.id);
      // Cada fila se compara con el momento en que ESA parte del lote la escribió, no con el cierre del lote.
      if (actual.updatedAt.getTime() > f.createdAt.getTime() + TOLERANCIA_MS) bloqueadas.push({ registro: nombre, motivo: "se modificó después de la importación" });
      else if (f.accion === "creado" && conDependientes.has(actual.id)) bloqueadas.push({ registro: nombre, motivo: conDependientes.get(actual.id) ?? "" });
    }
    const resumen = { aBorrar: creadas.length, aRestaurar: completadas.length };
    if (dryRun || bloqueadas.length > 0) return { revertido: false, ...resumen, bloqueadas: bloqueadas.slice(0, 100) };
    for (const f of completadas) {
      const previos = Object.entries(previosDe(f.previos)).filter(([k]) => !k.startsWith("_"));
      if (previos.length && actuales.has(f.id20 ?? ""))
        await imp.actualizar(tx, f.id20 ?? "", Object.fromEntries(previos.map(([k, v]) => [k, deJson(v)])));
    }
    // Solo los vínculos que creó este lote, por su id de origen (no todos los del registro).
    const externos = filas.map((f) => previosDe(f.previos)["_idExterno"]).filter((x): x is string => typeof x === "string");
    if (externos.length) await tx.idExterno.deleteMany({ where: { sistema: corrida.sistema, entidadTipo: imp.entidad, idExterno: { in: externos } } });
    try {
      await imp.borrar(tx, creadas.map((f) => f.id20 ?? ""));
    } catch (e) {
      if ((e as { code?: unknown } | null)?.code === "P2003")
        throw reglaDeNegocio("No se puede revertir: algún registro del lote ya tiene datos asociados en otro módulo. No se cambió nada.");
      throw e;
    }
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
