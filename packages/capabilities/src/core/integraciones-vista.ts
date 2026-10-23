import { z } from "zod";

import { credencialDePlataforma, definicionIntegracion, enmascarar } from "@opai/integrations";

import { noEncontrado } from "../errores";
import { estadoIntegracion, integracionDe } from "../integraciones/resolver";
import type { Contexto } from "../types";
import { iso } from "./comun";

export const integracionSchema = z.object({
  proveedor: z.string(),
  nombre: z.string(),
  categoria: z.string(),
  modalidad: z.string(),
  modalidades: z.array(z.string()),
  /** false si la modalidad "plataforma" no tiene credencial en este entorno (no se puede elegir). */
  plataformaDisponible: z.boolean(),
  /** configurada | no_configurada | no_disponible | error | proximamente */
  estado: z.string(),
  config: z.unknown(),
  secretos: z.array(
    z.object({ nombre: z.string(), etiqueta: z.string(), mascara: z.string().nullable() }),
  ),
  ultimoTestEn: z.string().nullable(),
  ultimoError: z.string().nullable(),
});

export async function vistaIntegracion(ctx: Contexto, proveedor: string) {
  const def = definicionIntegracion(proveedor);
  if (!def) throw noEncontrado(`La integración "${proveedor}"`);
  const fila = await integracionDe(ctx, proveedor);
  const secretos = fila ? await ctx.db.secreto.findMany({ where: { integracionId: fila.id } }) : [];
  return {
    proveedor: def.id,
    nombre: def.nombre,
    categoria: def.categoria,
    modalidad: fila?.modalidad ?? def.modalidades[0] ?? "propia",
    modalidades: [...def.modalidades],
    plataformaDisponible:
      def.modalidades.includes("plataforma") && credencialDePlataforma(def.id) !== null,
    estado: estadoIntegracion(
      def,
      fila,
      secretos.map((s) => s.nombre),
    ),
    config: fila?.config ?? {},
    secretos: def.secretos.map((s) => {
      const guardado = secretos.find((x) => x.nombre === s.nombre);
      return { ...s, mascara: guardado ? enmascarar(guardado.sufijo) : null };
    }),
    ultimoTestEn: iso(fila?.ultimoTestEn),
    ultimoError: fila?.ultimoError ?? null,
  };
}
