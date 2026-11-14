import { cierraCiclo, MODOS_JEFATURA, PERMISOS_CORE } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cargoDe, cargoSchema, conteos, vista } from "../maestros/cargos-vista";
import { definidos, escribirConEvento } from "../maestros/comun";
import { cargosConJefatura } from "./datos";

export const cargosSetJefatura = defineCapability({
  id: "core.cargos.set_jefatura",
  descripcion:
    "Define la jefatura de un cargo: a qué otro cargo reporta (null = a nadie) y a quiénes de este cargo ve cada jefe: solo las personas que tiene asignadas, todo el equipo, o las de sus instalaciones a cargo. De esto depende quién ve los resultados de quién. No acepta ciclos (A reporta a B y B a A).",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z
    .object({
      id: uuidSchema.describe("Cargo cuya jefatura se define."),
    jefaturaCargoId: uuidSchema
      .nullable()
      .optional()
      .describe("Cargo al que reporta. null lo deja sin jefatura. Sin enviar, no cambia."),
    jefaturaVe: z
      .enum(MODOS_JEFATURA)
      .optional()
      .describe("asignadas (por defecto), equipo o instalaciones. Sin enviar, no cambia."),
    })
    .refine((v) => v.jefaturaCargoId !== undefined || v.jefaturaVe !== undefined, {
      message: "Envía jefaturaCargoId, jefaturaVe o ambos.",
    }),
  output: cargoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await cargoDe(ctx, id);
    const jefaturaId = cambios.jefaturaCargoId;
    if (jefaturaId) {
      if (jefaturaId === id) throw reglaDeNegocio("Un cargo no puede ser su propia jefatura.");
      const jefatura = await cargoDe(ctx, jefaturaId);
      if (!jefatura.activo) throw reglaDeNegocio(`El cargo "${jefatura.nombre}" está inactivo.`);
      if (cierraCiclo(await cargosConJefatura(ctx), id, jefaturaId)) {
        throw reglaDeNegocio(
          `"${jefatura.nombre}" ya depende de "${actual.nombre}": quedarían reportándose entre sí.`,
        );
      }
    }
    const data = definidos(cambios);
    const n = await conteos(ctx, id);
    if (dryRun) return vista({ ...actual, ...data }, n);
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.cargo.actualizado", entidadTipo: "cargo", payload: () => data },
      (tx) => tx.cargo.update({ where: { id }, data }),
    );
    return vista(c, n);
  },
});
