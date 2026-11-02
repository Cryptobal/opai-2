import type { Contexto } from "@opai/capabilities";

import { PLANTILLA_SEGURIDAD } from "../domain/motor/plantilla";

const ITEMS_DEFECTO: readonly {
  codigo: string;
  nombre: string;
  categoriaClave: string;
  costoUnitarioClp: number;
  grupo: string;
  porDefecto: boolean;
}[] = [
  { codigo: "uniforme", nombre: "Uniforme", categoriaClave: "uniformes", costoUnitarioClp: 35_000, grupo: "uniforme", porDefecto: true },
  { codigo: "examen", nombre: "Examen preocupacional", categoriaClave: "examenes", costoUnitarioClp: 28_000, grupo: "item", porDefecto: true },
  { codigo: "equipo", nombre: "Equipamiento por puesto", categoriaClave: "equipamiento", costoUnitarioClp: 45_000, grupo: "item", porDefecto: true },
  { codigo: "inversion", nombre: "Inversión inicial", categoriaClave: "otros", costoUnitarioClp: 120_000, grupo: "item", porDefecto: false },
];

/** R55/R61: si el tenant no tiene catálogo, copia categorías de la plantilla y ítems de referencia. */
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
          modoCalculo: "mensual_fijo",
          rateoJson: '{"tipo":"contrato"}',
          costoUnitarioClp: item.costoUnitarioClp,
          recurrencia: "mensual",
          visibleCliente: true,
          porDefecto: item.porDefecto,
          activo: true,
        },
      });
    }
  });
}
