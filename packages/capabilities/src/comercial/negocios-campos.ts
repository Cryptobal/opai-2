// Campos personalizados en la ficha del negocio (CAR-27, PR 2), con los permisos de negocios.
import { z } from "zod";

import { defineCapability } from "../define";
import {
  guardarValores,
  leerValores,
  valoresEntrada,
  valoresSalida,
} from "../core/crm/campos-valores-comun";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_MANAGE, PERMISO_READ, negocioDe } from "./comun";

export const negociosCamposGet = defineCapability({
  auditarLectura: (_s, input) => [input.negocioId],
  id: "comercial.negocio_campos.get",
  descripcion:
    "Campos personalizados de la ficha de un negocio, con su valor guardado (null si no tiene).",
  permiso: PERMISO_READ,
  input: z.object({ negocioId: uuidSchema }),
  output: valoresSalida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { negocioId }) {
    await negocioDe(ctx, negocioId);
    return leerValores(ctx, { entidad: "negocio", id: negocioId });
  },
});

export const negociosCamposSet = defineCapability({
  id: "comercial.negocio_campos.set",
  descripcion:
    "Guarda valores de campos personalizados en la ficha de un negocio. Solo cambian las claves enviadas; null borra el valor.",
  permiso: PERMISO_MANAGE,
  input: z.object({ negocioId: uuidSchema, valores: valoresEntrada }),
  output: valoresSalida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { negocioId, valores }, { dryRun }) {
    await negocioDe(ctx, negocioId);
    return guardarValores(ctx, { entidad: "negocio", id: negocioId }, valores, dryRun);
  },
});
