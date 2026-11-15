// Valores de campos personalizados en las fichas del núcleo: cuentas, contactos, instalaciones y
// personas (CAR-27, CAR-536). Los de negocios viven en Comercial (`comercial.negocio_campos.*`).
// Cada ficha exige su propio permiso (registro de `@opai/domain`) y su alcance por filas.
import { z } from "zod";

import { FICHAS_CAMPO_PERSONALIZADO, PERMISOS_CORE as P } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import { uuidSchema } from "../esquemas";
import type { Contexto } from "../../types";
import { contactoDe } from "../maestros/contactos-vista";
import { cuentaDe } from "../maestros/cuentas-acceso";
import { instalacionDe } from "../maestros/instalaciones";
import { personaDe } from "../maestros/personas-vista";
import { guardarValores, leerValores, valoresEntrada, valoresSalida } from "./campos-valores-comun";

const entidad = z.enum(["cuenta", "contacto", "instalacion", "persona"]);
type Entidad = z.infer<typeof entidad>;
const ficha = { entidad, id: uuidSchema };

const VERIFICAR: Record<Entidad, (ctx: Contexto, id: string) => Promise<unknown>> = {
  cuenta: cuentaDe,
  contacto: contactoDe,
  instalacion: instalacionDe,
  persona: personaDe,
};

/** Exige el permiso de la ficha y que exista dentro del alcance del usuario (NOT_FOUND si no). */
async function fichaVisible(ctx: Contexto, e: Entidad, id: string, accion: "ver" | "editar") {
  if (!ctx.autorizar(FICHAS_CAMPO_PERSONALIZADO[e][accion]))
    throw prohibido(`No tienes permiso para ${accion} esta ficha.`);
  await VERIFICAR[e](ctx, id);
  return { entidad: e, id };
}

export const camposValoresGet = defineCapability({
  auditarLectura: (_s, input) => [input.id],
  id: "core.valores_personalizados.get",
  descripcion:
    "Campos personalizados de la ficha de una cuenta, un contacto, una instalación o una persona, con su valor guardado (null si no tiene), su valor por defecto y sus opciones.",
  permiso: P.cuentasRead,
  permisosAlternos: [P.instalacionesRead, P.personasRead],
  portales: ["erp"],
  input: z.object(ficha),
  output: valoresSalida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    return leerValores(ctx, await fichaVisible(ctx, input.entidad, input.id, "ver"));
  },
});

export const camposValoresSet = defineCapability({
  id: "core.valores_personalizados.set",
  descripcion:
    "Guarda valores de campos personalizados en la ficha de una cuenta, un contacto, una instalación o una persona. Solo cambian las claves enviadas; null borra el valor. Casillas múltiples: lista de valores internos; usuario: id de un usuario del ERP.",
  permiso: P.cuentasManage,
  permisosAlternos: [P.instalacionesManage, P.personasManage],
  portales: ["erp"],
  input: z.object({ ...ficha, valores: valoresEntrada }),
  output: valoresSalida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const f = await fichaVisible(ctx, input.entidad, input.id, "editar");
    return guardarValores(ctx, f, input.valores, dryRun);
  },
});
