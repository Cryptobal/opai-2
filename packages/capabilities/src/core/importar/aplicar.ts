// Aplica un plan como un lote reversible: todo en la transacción de la capacidad (o nada), con su fila
// de registro por cada fila de la planilla, los ids externos y un evento de dominio.
import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { contar, type Plan } from "./plan";
import { VERSION_MOTOR, type Conteos, type Datos, type Escalar, type FilaPlan, type Importador } from "./tipos";

const UNA_HORA = 3_600_000;

type Registro = { entidad: string; id10: string; id20: string | null; accion: string; motivo: string | null; previos: Record<string, unknown> | null };

/** Valor previo en JSON: fechas y decimales con marca para restaurarlos con su tipo al revertir. */
const aJson = (v: unknown): unknown =>
  v instanceof Date ? { $fecha: v.toISOString() } : v !== null && typeof v === "object" && !Array.isArray(v) ? { $texto: String(v) } : (v ?? null);

export const deJson = (v: unknown): Escalar | readonly string[] => {
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  const o = (typeof v === "object" ? v : {}) as { $fecha?: unknown; $texto?: unknown };
  if (typeof o.$fecha === "string") return new Date(o.$fecha);
  return typeof o.$texto === "string" ? o.$texto : null;
};

const acumular = (previo: unknown, n: Conteos): Conteos => {
  const p = (previo && typeof previo === "object" ? previo : {}) as Partial<Record<keyof Conteos, unknown>>;
  const de = (k: keyof Conteos) => (typeof p[k] === "number" ? p[k] : 0) + n[k];
  return { crear: de("crear"), actualizar: de("actualizar"), sin_cambio: de("sin_cambio"), error: de("error") };
};

async function corridaDe(tx: TenantTx, ctx: Contexto, imp: Importador, plan: Plan, importacionId: string | undefined) {
  if (!importacionId)
    return tx.importacion.create({
      data: {
        tenantId: ctx.tenantId, sistema: plan.sistema, origen: plan.origen, versionContrato: VERSION_MOTOR, modo: "aplicar",
        lanzadaPorId: ctx.usuario?.id ?? null, conteos: { importador: imp.def.id, archivo: plan.archivo },
      },
    });
  const c = await tx.importacion.findFirst({ where: { id: importacionId, versionContrato: VERSION_MOTOR } });
  const mismo = c && (c.conteos as { importador?: unknown } | null)?.importador === imp.def.id && c.sistema === plan.sistema;
  // Solo se amplía un lote propio y reciente (las partes de una misma planilla), nunca uno antiguo o ajeno.
  const propio = c && c.lanzadaPorId === (ctx.usuario?.id ?? null) && Date.now() - c.iniciadaEn.getTime() < UNA_HORA;
  if (!c || !mismo || !propio || c.estado !== "completada")
    throw reglaDeNegocio("El lote indicado no existe, no es tuyo, es de otro importador, ya fue revertido o tiene más de una hora.");
  return c;
}

async function escribirFila(tx: TenantTx, ctx: Contexto, imp: Importador, plan: Plan, f: FilaPlan<Datos>): Promise<Registro> {
  const base = { entidad: imp.entidad, id10: f.clave, motivo: null, previos: null };
  if (f.accion === "error") return { ...base, id20: null, accion: "omitido", motivo: f.mensajes.join(" ").slice(0, 500) };
  if (f.accion === "crear" && f.datos) return { ...base, id20: await imp.crear(tx, ctx, f.datos), accion: "creado" };
  const existente = f.existente;
  if (!existente) throw reglaDeNegocio("El plan cambió mientras se importaba. Vuelve a simular.");
  const cambios = plan.cambios.get(f.fila) ?? {};
  if (f.accion === "sin_cambio" || Object.keys(cambios).length === 0) return { ...base, id20: existente.id, accion: "sin_cambio" };
  await imp.actualizar(tx, existente.id, cambios as Partial<Datos>);
  const previos = Object.fromEntries(Object.keys(cambios).map((k) => [k, aJson(existente[k])]));
  return { ...base, id20: existente.id, accion: "completado", previos };
}

/** Vincula los ids de origen que todavía no estaban registrados y marca en `previos` los vínculos nuevos. */
async function vincularExternos(tx: TenantTx, ctx: Contexto, imp: Importador, plan: Plan, registros: Registro[]) {
  const pares = plan.filas.flatMap((f, i) => {
    const r = registros[i];
    return f.idExterno && r?.id20 ? [{ idExterno: f.idExterno, r, id20: r.id20 }] : [];
  });
  if (!pares.length) return;
  const ya = await tx.idExterno.findMany({
    where: { sistema: plan.sistema, entidadTipo: imp.entidad, idExterno: { in: pares.map((p) => p.idExterno) } },
    select: { idExterno: true },
  });
  const existentes = new Set(ya.map((y) => y.idExterno));
  const nuevos = pares.filter((p) => !existentes.has(p.idExterno));
  for (const p of nuevos) p.r.previos = { ...(p.r.previos ?? {}), _idExterno: p.idExterno };
  if (nuevos.length)
    await tx.idExterno.createMany({
      data: nuevos.map((p) => ({ tenantId: ctx.tenantId, sistema: plan.sistema, entidadTipo: imp.entidad, entidadId: p.id20, idExterno: p.idExterno })),
    });
}

export async function aplicarPlan(ctx: Contexto, imp: Importador, plan: Plan, importacionId?: string) {
  try {
    return await ctx.transaccion(async (tx) => {
      const corrida = await corridaDe(tx, ctx, imp, plan, importacionId);
      const previas = new Set((await tx.importacionFila.findMany({ where: { importacionId: corrida.id }, select: { id10: true } })).map((x) => x.id10));
      const filas = plan.filas.map((f): FilaPlan<Datos> =>
        previas.has(f.clave) && f.accion !== "error" ? { ...f, accion: "error", mensajes: ["Este registro ya venía en una parte anterior del mismo lote."] } : f,
      );
      const registros: Registro[] = [];
      for (const [i, f] of filas.entries()) {
        const r = await escribirFila(tx, ctx, imp, plan, f);
        registros.push(previas.has(r.id10) ? { ...r, id10: `${r.id10}#${Date.now()}-${i}` } : r);
      }
      await vincularExternos(tx, ctx, imp, { ...plan, filas }, registros);
      // Hora del cliente al terminar de escribir: es el límite de «se modificó después» al revertir cada fila.
      const ahora = new Date();
      await tx.importacionFila.createMany({
        data: registros.map((r) => ({ createdAt: ahora, tenantId: ctx.tenantId, importacionId: corrida.id, entidad: r.entidad, id10: r.id10, id20: r.id20, accion: r.accion, motivo: r.motivo, ...(r.previos ? { previos: r.previos as object } : {}) })),
      });
      const hechos = contar(filas.map((f, i) => ({ accion: registros[i]?.accion === "sin_cambio" ? ("sin_cambio" as const) : f.accion })));
      const conteos = { ...acumular(corrida.conteos, hechos), importador: imp.def.id, archivo: plan.archivo };
      await tx.importacion.update({ where: { id: corrida.id }, data: { estado: "completada", conteos, terminadaEn: ahora } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.importacion.aplicada",
        entidadTipo: "importacion",
        entidadId: corrida.id,
        payload: { importador: imp.def.id, creados: hechos.crear, actualizados: hechos.actualizar, sinCambio: hechos.sin_cambio, omitidos: hechos.error },
      });
      return { importacionId: corrida.id, hechos };
    });
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === "P2002")
      throw reglaDeNegocio("Los datos cambiaron mientras se importaba (apareció un registro repetido). Vuelve a simular e inténtalo de nuevo; no se guardó nada.");
    throw e;
  }
}
