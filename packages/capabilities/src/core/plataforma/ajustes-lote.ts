import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { platformAjustesSet } from "../config/plataforma";
import { platformPreciosSet } from "./precios";

const cambioSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("precio"),
    recurso: z.string().trim().min(3).max(80),
    unidad: z.string().trim().min(1).max(40),
    costoUnitarioMicro: z.number().int().min(0).max(1_000_000_000),
  }),
  z.object({
    tipo: z.literal("ajuste"),
    modulo: z.string(),
    clave: z.string(),
    valor: z.unknown(),
  }),
]);

const resultadoSchema = z.object({
  tipo: z.enum(["precio", "ajuste"]),
  clave: z.string().describe("Recurso del precio o «modulo.clave» del ajuste."),
  antes: z.unknown(),
  despues: z.unknown(),
});

const claveDe = (c: z.output<typeof cambioSchema>) =>
  c.tipo === "precio" ? `precio:${c.recurso}` : `ajuste:${c.modulo}.${c.clave}`;

/**
 * Guarda de una vez los precios y ajustes de Plataforma › Ajustes (CAR-329): todo o nada. Corre cada
 * cambio con la misma lógica de `platform.precios.set` y `platform.ajustes.set`, dentro de la
 * transacción de su auditoría global: si uno falla, no queda guardado ninguno.
 */
export const platformAjustesGuardarLote = defineCapability({
  id: "platform.ajustes.guardar_lote",
  descripcion:
    "Plataforma: guarda juntos varios cambios de precios (desde hoy) y ajustes para todas las empresas. Si uno falla, no se guarda ninguno.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ cambios: z.array(cambioSchema).min(1).max(50) }),
  output: z.object({ cambios: z.array(resultadoSchema) }),
  // Irreversible como `platform.precios.set` (CAR-41): un agente queda en aprobación humana.
  efecto: "irreversible",
  dryRun: true,
  cambio: (s) => ({
    antes: s.cambios.map((c) => ({ clave: c.clave, valor: c.antes })),
    despues: s.cambios.map((c) => ({ clave: c.clave, valor: c.despues })),
  }),
  async handler(ctx, { cambios }, modo) {
    const claves = cambios.map(claveDe);
    if (new Set(claves).size !== claves.length)
      throw reglaDeNegocio("Hay un precio o ajuste repetido en los cambios.");
    const out: z.input<typeof resultadoSchema>[] = [];
    for (const c of cambios) {
      if (c.tipo === "precio") {
        const { anterior, ...nuevo } = await platformPreciosSet.handler(
          ctx,
          { recurso: c.recurso, unidad: c.unidad, costoUnitarioMicro: c.costoUnitarioMicro },
          modo,
        );
        out.push({ tipo: "precio", clave: c.recurso, antes: anterior, despues: nuevo });
      } else {
        const r = await platformAjustesSet.handler(
          ctx,
          { modulo: c.modulo, clave: c.clave, valor: c.valor },
          modo,
        );
        out.push({
          tipo: "ajuste",
          clave: `${r.modulo}.${r.clave}`,
          antes: r.anterior,
          despues: { valor: r.valor, version: r.version },
        });
      }
    }
    return { cambios: out };
  },
});
