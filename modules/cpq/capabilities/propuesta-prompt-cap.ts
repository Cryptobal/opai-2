import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import { COLECCIONES_CAMPO, clasificarCampos } from "@opai/domain";

import { generarPromptPropuesta } from "../domain/documento/prompt-exportable";
import { vistaMarcaDocumento } from "../persistencia/marca-documento";
import { PERMISO_READ } from "./permisos";

export const propuestaPromptExportable = defineCapability({
  id: "cpq.propuestas_tecnica.prompt_exportable",
  descripcion:
    "Entrega el prompt exportable de la propuesta técnica, generado desde el catálogo único de campos: marcadores disponibles para quien consulta, alias, formatos, reglas de repetición y condición, ejemplos ficticios, el estilo guardado de la empresa (colores, tipografía y si tiene logo) y las reglas para devolver un fragmento HTML que el importador acepte. No incluye datos de clientes.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({
    version: z.number(),
    finalidad: z.literal("propuesta"),
    texto: z.string(),
    claves: z.array(z.string()),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const c = clasificarCampos("propuesta", (p) => ctx.autorizar(p));
    const marca = await vistaMarcaDocumento(ctx);
    return generarPromptPropuesta({
      disponibles: c.autorizados,
      sinValores: c.sinResolvedor,
      colecciones: COLECCIONES_CAMPO,
      estilo: {
        colorPrimario: marca.colorPrimario,
        colorSecundario: marca.colorSecundario,
        tipografia: marca.tipografia,
        tieneLogo: marca.logoUrl !== null,
      },
    });
  },
});
