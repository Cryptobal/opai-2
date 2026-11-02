import type { Contexto } from "@opai/capabilities";

import type { ModeloCosteo } from "../domain/motor/tipos";
import { PLANTILLA_SEGURIDAD } from "../domain/motor/plantilla";
import { ITEMS_DEFECTO, itemMotorDesdeSeed } from "./catalogo-seed-items";

/** Catálogo por defecto 1.0 solo en memoria (lecturas sin siembra en base). */
export function modeloCatalogoDefectoEnMemoria(): ModeloCosteo {
  const base = structuredClone(PLANTILLA_SEGURIDAD);
  base.categorias = PLANTILLA_SEGURIDAD.categorias.map((c) => ({ ...c }));
  base.items = ITEMS_DEFECTO.map((item) => itemMotorDesdeSeed(item));
  return base;
}

/** R55/R61: si el tenant no tiene catálogo, copia categorías de la plantilla e ítems con fórmulas 1.0. */
export async function ensurePlantillaCatalogo(ctx: Contexto) {
  const existentes = await ctx.db.cpqCatalogoCategoria.count();
  if (existentes > 0) return;
  await ctx.transaccion(async (tx) => {
    const catMap = new Map<string, string>();
    let orden = 0;
    for (const c of PLANTILLA_SEGURIDAD.categorias) {
      const fila = await tx.cpqCatalogoCategoria.create({
        data: {
          tenantId: ctx.tenantId,
          clave: c.id,
          nombre: c.nombre,
          clase: c.clase,
          activa: true,
          orden: orden++,
        },
      });
      catMap.set(c.id, fila.id);
    }
    for (const item of ITEMS_DEFECTO) {
      const categoriaId = catMap.get(item.categoriaClave);
      if (!categoriaId) continue;
      await tx.cpqCatalogoItem.create({
        data: {
          tenantId: ctx.tenantId,
          codigo: item.codigo,
          nombre: item.nombre,
          categoriaId,
          grupo: item.grupo,
          unidad: "unidad",
          modoCalculo: item.modoCalculo,
          rateoJson: item.rateoJson,
          costoUnitarioClp: item.costoUnitarioClp,
          recurrencia: item.recurrencia,
          visibleCliente: true,
          porDefecto: item.porDefecto,
          activo: true,
        },
      });
    }
  });
}
