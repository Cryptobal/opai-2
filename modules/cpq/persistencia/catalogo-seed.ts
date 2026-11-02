import type { Contexto } from "@opai/capabilities";

import { PLANTILLA_SEGURIDAD } from "../domain/motor/plantilla";

type ItemSeed = {
  codigo: string;
  nombre: string;
  categoriaClave: string;
  costoUnitarioClp: number;
  grupo: string;
  modoCalculo: string;
  recurrencia: "mensual" | "unico";
  rateoJson: string;
  porDefecto: boolean;
};

/** Precios ficticios de referencia 1.0; las fórmulas siguen en la plantilla del motor. */
const ITEMS_DEFECTO: readonly ItemSeed[] = [
  {
    codigo: "uniforme",
    nombre: "Uniforme",
    categoriaClave: "uniformes",
    costoUnitarioClp: 35_000,
    grupo: "uniforme",
    modoCalculo: "formula.uniforme",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: true,
  },
  {
    codigo: "examen",
    nombre: "Examen preocupacional",
    categoriaClave: "examenes",
    costoUnitarioClp: 28_000,
    grupo: "item",
    modoCalculo: "formula.examen",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: true,
  },
  {
    codigo: "vehiculo",
    nombre: "Vehículo",
    categoriaClave: "vehiculos",
    costoUnitarioClp: 0,
    grupo: "item",
    modoCalculo: "formula.vehiculo",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: false,
  },
  {
    codigo: "infra",
    nombre: "Infraestructura",
    categoriaClave: "infraestructura",
    costoUnitarioClp: 0,
    grupo: "item",
    modoCalculo: "formula.infra",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: false,
  },
  {
    codigo: "comida",
    nombre: "Colación",
    categoriaClave: "colacion",
    costoUnitarioClp: 4_500,
    grupo: "item",
    modoCalculo: "formula.comida",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: false,
  },
  {
    codigo: "equipo",
    nombre: "Equipamiento por puesto",
    categoriaClave: "equipamiento",
    costoUnitarioClp: 45_000,
    grupo: "item",
    modoCalculo: "por_puesto_mes",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: true,
  },
  {
    codigo: "inversion",
    nombre: "Inversión inicial",
    categoriaClave: "otros",
    costoUnitarioClp: 120_000,
    grupo: "item",
    modoCalculo: "inversion",
    recurrencia: "unico",
    rateoJson: '{"tipo":"unico"}',
    porDefecto: false,
  },
];

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
