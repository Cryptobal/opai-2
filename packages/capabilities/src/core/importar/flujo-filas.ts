// Importador de las filas (categorías de egreso) del flujo de caja (CAR-349, bloque 3). Así una empresa trae las
// categorías que ya usaba (Gard, las de OPAI 1) sin crearlas una por una. Los ingresos no se importan: salen solos de
// lo facturado y cobrado (decisión de Carlos del 6-nov-2026, ADR-073).
import { entero, idsExternos, norm, texto } from "./comun";
import { DEF_FLUJO_FILAS } from "./flujo-campos";
import type { FilaPlan, Importador } from "./tipos";

/** Permiso del flujo de caja para configurar filas (el mismo de `finanzas.filas.crear`). */
export const PERMISO_FLUJO_CONFIGURAR = "finanzas:flujo.configurar";

export type DatosFlujoFila = { etiqueta: string; seccion: string; orden: number };

export const importadorFlujoFilas: Importador<DatosFlujoFila> = {
  def: DEF_FLUJO_FILAS,
  entidad: "flujo_fila",
  permiso: PERMISO_FLUJO_CONFIGURAR,
  modulo: "finanzas",
  actualizables: ["orden"],
  // Sin columna de orden queda 0: no pisa el orden de una fila existente.
  sinDato: { orden: 0 },
  async planificar(ctx, filas, o) {
    const externos = await idsExternos(ctx, "flujo_fila", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    const existentes = await ctx.db.flujoFila.findMany({ select: { id: true, etiqueta: true, seccion: true, orden: true } });
    const porId = new Map(existentes.map((e) => [e.id, e]));
    return filas.map((f): FilaPlan<DatosFlujoFila> => {
      const etiqueta = texto(f.datos["etiqueta"]) ?? "";
      const seccion = texto(f.datos["seccion"]) ?? "egreso";
      const idExterno = texto(f.datos["id_externo"]);
      const base = { fila: f.fila, clave: `fila:${norm(etiqueta)}`, etiqueta };
      if (seccion === "ingreso")
        return { ...base, accion: "error", mensajes: ["Los ingresos no se importan: salen solos de lo facturado y cobrado."] };
      if (etiqueta.length < 2) return { ...base, accion: "error", mensajes: ["El nombre de la fila debe tener al menos 2 caracteres."] };
      const datos: DatosFlujoFila = { etiqueta, seccion, orden: Math.min(Math.max(entero(f.datos["orden"]) ?? 0, 0), 1000) };
      // El nombre es único por empresa en la base: manda sobre el id externo para encontrar la existente.
      const existente = existentes.find((e) => norm(e.etiqueta) === norm(etiqueta)) ?? (idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined);
      if (existente && existente.seccion !== "egreso")
        return { ...base, accion: "error", mensajes: ["Ya existe una fila de ingresos con ese nombre."] };
      return { ...base, accion: existente ? "actualizar" : "crear", mensajes: [], datos, idExterno, ...(existente ? { existente } : {}) };
    });
  },
  async crear(tx, ctx, datos) {
    return (await tx.flujoFila.create({ data: { ...datos, tenantId: ctx.tenantId, activa: true, arrastre: false }, select: { id: true } })).id;
  },
  async actualizar(tx, id, { etiqueta: _e, seccion: _s, ...cambios }) {
    await tx.flujoFila.update({ where: { id }, data: cambios });
  },
  actuales: async (tx, ids) => (await tx.flujoFila.findMany({ where: { id: { in: [...ids] } } })).map((f) => ({ ...f, nombre: f.etiqueta })),
  async bloqueos(tx, ids) {
    const filas = await tx.flujoFila.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, _count: { select: { celdas: true, recurrentes: true } } },
    });
    const conciliadas = await tx.conciliacionBanco.findMany({
      where: { tipoEnlace: "flujo_fila", enlaceId: { in: [...ids] } },
      select: { enlaceId: true },
      distinct: ["enlaceId"],
    });
    const reglas = await tx.reglaConciliacion.findMany({ where: { flujoFilaId: { in: [...ids] } }, select: { flujoFilaId: true } });
    const cuentas = await tx.cuentaBancaria.findMany({ where: { flujoFilaId: { in: [...ids] } }, select: { flujoFilaId: true } });
    const out = new Map<string, string>();
    for (const r of [...reglas, ...cuentas]) if (r.flujoFilaId) out.set(r.flujoFilaId, "la usa una regla o una cuenta del banco");
    for (const f of filas) if (f._count.celdas > 0 || f._count.recurrentes > 0) out.set(f.id, "tiene cifras o gastos recurrentes cargados");
    for (const c of conciliadas) if (c.enlaceId) out.set(c.enlaceId, "tiene movimientos del banco clasificados");
    return out;
  },
  async borrar(tx, ids) {
    await tx.flujoFila.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
