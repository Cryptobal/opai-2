import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import { tieneTextoTipo } from "@opai/domain";

import { TIPOS_BLOQUE_PROPUESTA } from "../domain/documento/propuesta-tecnica";
import { guardarTextoTipo } from "../persistencia/biblioteca-bloques";
import { PERMISO_BIBLIOTECA } from "./permisos";

export const bibliotecaBloquesGuardarTextoTipo = defineCapability({
  id: "cpq.biblioteca_bloques.guardar_texto_tipo",
  descripcion:
    "Guarda y publica el texto tipo de la empresa para un tipo de sección de la propuesta. Las propuestas nuevas lo traen precargado; las ya enviadas no cambian.",
  permiso: PERMISO_BIBLIOTECA,
  input: z
    .object({ tipo: z.enum(TIPOS_BLOQUE_PROPUESTA), texto: z.string().max(20_000) })
    .refine((i) => tieneTextoTipo(i.tipo), { message: "Esta sección no tiene texto tipo.", path: ["tipo"] }),
  output: z.object({ id: z.string(), versionPublicada: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const row = await guardarTextoTipo(ctx, input.tipo, input.texto, !dryRun);
    return { id: row.id, versionPublicada: row.versionPublicada };
  },
});
