import { z } from "zod";

import { entradaCatalogo, esIncluidoEnBase, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado, reglaDeNegocio } from "../../../errores";
import { requierePlataforma } from "../../comun";
import { formaSchema, monedaSchema, unidadSchema } from "../cobros/esquemas";
import { montoEntero } from "../cobros/precio";
import { MODULO_AJUSTE_CATALOGO, precioListaSchema, preciosDeLista, textoDe } from "./datos";

const montoTexto = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .describe("CLP en pesos enteros («250000») o UF con hasta 4 decimales («0,10»).");

const versionada = z.object({
  precio: precioListaSchema,
  texto: z.string(),
  version: z.number().int(),
});

export const platformCatalogoPrecioSet = defineCapability({
  id: "platform.catalogo.precio_set",
  descripcion:
    "Plataforma: fija el precio de lista de un cobrable del catálogo (plan base, módulo o parte de Finanzas) o lo quita con `precio: null`. El precio de lista solo rellena la hoja «Cobro» de una empresa: no cambia las condiciones de las empresas ni los cargos ya generados. Lo incluido en el plan base no tiene precio. La vista previa no escribe.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    moduloId: z.string().min(1).max(60),
    precio: z
      .object({
        moneda: monedaSchema.default("UF"),
        forma: formaSchema.default("fijo"),
        unidad: unidadSchema.nullable().optional(),
        precio: montoTexto,
        minimoMensual: montoTexto.nullable().optional(),
      })
      .nullable(),
  }),
  output: z.object({
    moduloId: z.string(),
    antes: versionada.nullable(),
    despues: versionada.nullable(),
  }),
  efecto: "escritura",
  dryRun: true,
  // La auditoría global guarda el precio de lista de antes y el de después (ADR-021).
  cambio: (s) => ({ antes: s.antes, despues: s.despues }),
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    const e = entradaCatalogo(input.moduloId);
    if (!e) throw noEncontrado(`El cobrable "${input.moduloId}"`);
    if (esIncluidoEnBase(e.id))
      throw reglaDeNegocio(`${e.nombre} está incluido en el plan base: no tiene precio aparte.`);
    const previo = (await preciosDeLista(p)).get(e.id) ?? null;
    const antes = previo && {
      precio: previo.precio,
      texto: textoDe(previo.precio) ?? "",
      version: previo.version,
    };
    const x = input.precio;
    if (x?.forma === "por_unidad" && !x.unidad)
      throw reglaDeNegocio("El cobro por unidad necesita la unidad que se cuenta.");
    const nuevo = x && {
      moneda: x.moneda,
      forma: x.forma,
      unidad: x.forma === "por_unidad" ? (x.unidad ?? null) : null,
      precio: montoEntero(x.moneda, x.precio),
      minimoMensual: x.minimoMensual ? montoEntero(x.moneda, x.minimoMensual) : null,
    };
    // La versión nunca retrocede: se lee de la fila, que tras quitar el precio queda con valor vacío.
    const where = { modulo_clave: { modulo: MODULO_AJUSTE_CATALOGO, clave: e.id } };
    const version = ((await p.globales.ajustePorClave(where))?.version ?? 0) + 1;
    const despues = nuevo && { precio: nuevo, texto: textoDe(nuevo) ?? "", version };
    if (!dryRun) {
      if (nuevo) {
        await p.globales.guardarAjuste(
          {
            where,
            create: {
              modulo: MODULO_AJUSTE_CATALOGO,
              clave: e.id,
              valor: nuevo,
              actualizadoPor: ctx.usuario?.id ?? null,
            },
            update: { valor: nuevo, version, actualizadoPor: ctx.usuario?.id ?? null },
          },
          ctx.db,
        );
      } else if (previo) {
        // Sin precio: se guarda un valor vacío con versión nueva (la historia queda en la auditoría).
        await p.globales.guardarAjuste(
          {
            where,
            create: { modulo: MODULO_AJUSTE_CATALOGO, clave: e.id, valor: {} },
            update: { valor: {}, version, actualizadoPor: ctx.usuario?.id ?? null },
          },
          ctx.db,
        );
      }
    }
    return { moduloId: e.id, antes, despues };
  },
});
