import { CLASES_TAREA, type ClaseTarea, type ProveedorIaId } from "@opai/integrations";

import { prohibido } from "../errores";
import type { Contexto } from "../types";
import { iaDe } from "./ia";
import { candidatosIa } from "./ia-candidatos";

export type ModeloAgente = { proveedor: ProveedorIaId; modelo: string; clase: ClaseTarea };

/** Solo opciones ya conectadas y resueltas por E1; nunca devuelve credenciales. */
export async function modelosDelAgente(ctx: Contexto): Promise<ModeloAgente[]> {
  const listas = await Promise.all(
    CLASES_TAREA.map(async (clase) => {
      const { cands } = await candidatosIa(ctx, clase);
      return cands.map((c) => ({ proveedor: c.id, modelo: c.modelo, clase }));
    }),
  );
  return listas.flat();
}

/** La elección del cliente no puede inventar un proveedor ni un modelo. */
export async function iaElegidaDelAgente(ctx: Contexto, elegida: ModeloAgente) {
  const permitidos = await modelosDelAgente(ctx);
  if (
    !permitidos.some(
      (m) =>
        m.proveedor === elegida.proveedor &&
        m.modelo === elegida.modelo &&
        m.clase === elegida.clase,
    )
  ) {
    throw prohibido("Modelo no disponible para esta empresa.");
  }
  const ia = await iaDe(ctx, elegida.clase, "agente", elegida.proveedor);
  if (!ia || ia.modelo !== elegida.modelo)
    throw prohibido("Modelo no disponible para esta empresa.");
  return ia;
}
