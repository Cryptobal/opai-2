// Valores de campos personalizados en las fichas de cuentas y contactos (CAR-27, PR 2).
// Los de negocios viven en Comercial (`comercial.negocio_campos.*`) con los permisos de negocios.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import type { Contexto } from "../../types";
import { contactoDe } from "../maestros/contactos-vista";
import { cuentaDe } from "../maestros/cuentas-acceso";
import { guardarValores, leerValores, valoresEntrada, valoresSalida } from "./campos-valores-comun";

const entidad = z.enum(["cuenta", "contacto"]);
const ficha = { entidad, id: uuidSchema };

/** Verifica que la ficha exista y esté dentro del alcance del usuario (NOT_FOUND si no). */
async function fichaVisible(ctx: Contexto, e: z.infer<typeof entidad>, id: string) {
  if (e === "cuenta") await cuentaDe(ctx, id);
  else await contactoDe(ctx, id);
  return { entidad: e, id };
}

export const camposValoresGet = defineCapability({
  auditarLectura: (_s, input) => [input.id],
  id: "core.valores_personalizados.get",
  descripcion:
    "Campos personalizados de la ficha de una cuenta o un contacto, con su valor guardado (null si no tiene).",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp"],
  input: z.object(ficha),
  output: valoresSalida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    return leerValores(ctx, await fichaVisible(ctx, input.entidad, input.id));
  },
});

export const camposValoresSet = defineCapability({
  id: "core.valores_personalizados.set",
  descripcion:
    "Guarda valores de campos personalizados en la ficha de una cuenta o un contacto. Solo cambian las claves enviadas; null borra el valor.",
  permiso: PERMISOS_CORE.cuentasManage,
  portales: ["erp"],
  input: z.object({ ...ficha, valores: valoresEntrada }),
  output: valoresSalida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const f = await fichaVisible(ctx, input.entidad, input.id);
    return guardarValores(ctx, f, input.valores, dryRun);
  },
});
