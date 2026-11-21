import { camposConClave, errorDeTipo, nombreNormalizado, normalizarTalla } from "@opai/domain";
import type { CampoTipo } from "@opai/domain";

import { conflicto, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { camposGuardados, duplicado } from "./comun";
import { comportamientoDeCategoria } from "./categorias-kit";
import { exigirPrendaDelKit } from "./prendas";

export type InputActualizarTipo = {
  id: string;
  nombre?: string | undefined;
  descripcion?: string | null | undefined;
  campos?: { clave?: string | undefined; etiqueta: string; tipo: "texto" | "numero" | "fecha"; obligatorio: boolean }[] | undefined;
  tallas?: string[] | undefined;
  prendaClave?: string | null | undefined;
  entregaAPersona?: boolean | undefined;
  activo?: boolean | undefined;
};

export async function prepararActualizacionTipo(
  ctx: Contexto,
  input: InputActualizarTipo,
  actual: NonNullable<Awaited<ReturnType<Contexto["db"]["inventarioTipo"]["findFirst"]>>>,
) {
  const guardados = camposGuardados(actual.campos);
  const existentes = new Set(guardados.map((c) => c.clave));
  const desconocida = input.campos?.find((c) => c.clave && !existentes.has(c.clave));
  if (desconocida) throw reglaDeNegocio(`El campo «${desconocida.etiqueta}» no es de este tipo.`);
  const nombre = input.nombre ?? actual.nombre;
  const campos: CampoTipo[] = input.campos ? camposConClave(input.campos, [...existentes]) : guardados;
  const f = {
    ...actual,
    nombre,
    nombreNormalizado: nombreNormalizado(nombre),
    descripcion: input.descripcion !== undefined ? input.descripcion || null : actual.descripcion,
    campos,
    tallas: input.tallas ? input.tallas.map(normalizarTalla) : actual.tallas,
    prendaClave: input.prendaClave !== undefined ? input.prendaClave : actual.prendaClave,
    entregaAPersona: input.entregaAPersona ?? actual.entregaAPersona,
    activo: input.activo ?? actual.activo,
  };
  const comportamiento = (await comportamientoDeCategoria(ctx, actual.categoria)) ?? "activo";
  const error = errorDeTipo({ comportamiento, campos: f.campos, tallas: f.tallas });
  if (error) throw reglaDeNegocio(error);
  if (comportamiento === "activo" && f.prendaClave)
    throw reglaDeNegocio("La prenda del uniforme es solo para tipos de ropa.");
  if (f.prendaClave && f.prendaClave !== actual.prendaClave) await exigirPrendaDelKit(ctx, f.prendaClave);
  if (f.nombreNormalizado !== actual.nombreNormalizado) {
    const otro = await ctx.db.inventarioTipo.findFirst({
      where: { nombreNormalizado: f.nombreNormalizado, id: { not: actual.id } },
    });
    if (otro) throw conflicto(duplicado(nombre));
  }
  return f;
}