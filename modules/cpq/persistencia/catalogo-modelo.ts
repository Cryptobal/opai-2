import type { Contexto } from "@opai/capabilities";

import type { Item, ModeloCosteo, Rateo } from "../domain/motor/tipos";
import { PLANTILLA_SEGURIDAD } from "../domain/motor/plantilla";
import { ensurePlantillaCatalogo } from "./catalogo-seed";

function parseRateo(raw: string | null): Rateo | undefined {
  if (!raw) return undefined;
  return JSON.parse(raw) as Rateo;
}

function itemMotorDesdeFila(
  fila: {
    codigo: string;
    modoCalculo: string;
    costoUnitarioClp: number;
    rateoJson: string | null;
  },
  categoriaClave: string,
): Item {
  const plantilla = PLANTILLA_SEGURIDAD.items.find((i) => i.id === fila.codigo);
  const rateo = parseRateo(fila.rateoJson) ?? plantilla?.rateo ?? { tipo: "contrato" };
  const modoCalculo = fila.modoCalculo;
  if (modoCalculo.startsWith("formula.")) {
    return {
      id: fila.codigo,
      categoria: categoriaClave,
      costoUnitario: fila.costoUnitarioClp,
      moneda: "CLP",
      modo: "formula",
      formula: modoCalculo,
      rateo,
    };
  }
  if (modoCalculo === "por_puesto_mes") {
    return {
      id: fila.codigo,
      categoria: categoriaClave,
      costoUnitario: fila.costoUnitarioClp,
      moneda: "CLP",
      modo: "por_puesto_mes",
      rateo,
    };
  }
  if (modoCalculo === "por_persona_mes") {
    return {
      id: fila.codigo,
      categoria: categoriaClave,
      costoUnitario: fila.costoUnitarioClp,
      moneda: "CLP",
      modo: "por_persona_mes",
      rateo,
    };
  }
  if (modoCalculo === "inversion") {
    return {
      id: fila.codigo,
      categoria: categoriaClave,
      costoUnitario: fila.costoUnitarioClp,
      moneda: "CLP",
      modo: "inversion",
      rateo,
    };
  }
  return {
    id: fila.codigo,
    categoria: categoriaClave,
    costoUnitario: fila.costoUnitarioClp,
    moneda: "CLP",
    modo: "mensual_fijo",
    rateo,
  };
}

/** R-CPQ-013–019: modelo del tenant (catálogo + fórmulas de la plantilla de referencia). */
export async function modeloDesdeCatalogo(ctx: Contexto): Promise<ModeloCosteo> {
  await ensurePlantillaCatalogo(ctx);
  const categorias = await ctx.db.cpqCatalogoCategoria.findMany({
    orderBy: [{ orden: "asc" }, { id: "asc" }],
  });
  const filas = await ctx.db.cpqCatalogoItem.findMany({
    where: { activo: true },
    orderBy: [{ codigo: "asc" }],
  });
  const clavePorId = new Map(categorias.map((c) => [c.id, c.clave]));
  const base = structuredClone(PLANTILLA_SEGURIDAD);
  base.categorias = categorias.map((c) => {
    const ref = PLANTILLA_SEGURIDAD.categorias.find((x) => x.id === c.clave);
    return {
      id: c.clave,
      nombre: c.nombre,
      clase: c.clase as "directo" | "indirecto",
      ...(ref?.fija ? { fija: true } : {}),
    };
  });
  base.items = filas.map((f) => {
    const cat = clavePorId.get(f.categoriaId);
    if (!cat) throw new Error(`Ítem ${f.codigo} sin categoría de catálogo`);
    return itemMotorDesdeFila(f, cat);
  });
  return base;
}
