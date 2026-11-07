import { z } from "zod";

import { ENTRADAS_CATALOGO, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../../define";
import { requierePlataforma } from "../../comun";
import { formaSchema, unidadSchema } from "../cobros/esquemas";
import { dependenciasTexto, precioListaSchema, preciosDeLista, textoDe } from "./datos";

const entradaSchema = z.object({
  id: z.string().describe("Id del cobrable: `base`, un módulo o una parte (`finanzas.bancos`)."),
  nombre: z.string(),
  incluye: z.string().describe("Qué incluye, en una frase."),
  grupo: z.enum(["base", "modulo", "finanzas", "parte_finanzas"]),
  incluidoEnBase: z.boolean().describe("true: viene en el plan base y no tiene precio aparte."),
  formaSugerida: formaSchema.nullable(),
  unidadSugerida: unidadSchema.nullable(),
  dependencias: z
    .array(z.array(z.string()))
    .describe("Cada grupo es una alternativa: basta cumplir un id de cada grupo."),
  dependenciasTexto: z.array(z.string()),
  precioLista: precioListaSchema.nullable().describe("Precio de lista vigente; null si no hay."),
  textoPrecio: z.string().nullable().describe("Precio de lista escrito: «UF 0,10 por …»."),
  version: z.number().int().describe("Versión del precio de lista (0: nunca fijado)."),
});

export const platformCatalogoList = defineCapability({
  id: "platform.catalogo.list",
  descripcion:
    "Plataforma: catálogo de lo que se puede cobrar a una empresa: el plan base, los módulos y las siete partes de Finanzas, cada uno con lo que incluye, si viene en el plan base (sin precio aparte), su forma y unidad sugeridas, sus dependencias y el precio de lista vigente. La firma se cobra por uso y no está en este catálogo.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({}),
  output: z.array(entradaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const precios = await preciosDeLista(requierePlataforma(ctx));
    return ENTRADAS_CATALOGO.map((e) => {
      const p = e.incluidoEnBase ? undefined : precios.get(e.id);
      return {
        ...e,
        dependencias: e.dependencias.map((a) => [...a]),
        dependenciasTexto: dependenciasTexto(e.id),
        precioLista: p?.precio ?? null,
        textoPrecio: textoDe(p?.precio ?? null),
        version: p?.version ?? 0,
      };
    });
  },
});
