import { z } from "zod";

import {
  COLECCIONES_CAMPO,
  PERMISOS_CORE,
  VERSION_CATALOGO_CAMPOS,
  clasificarCampos,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { finalidadSchema } from "./comun";

const campoSchema = z.object({
  clave: z.string(),
  descripcion: z.string(),
  tipo: z.string(),
  fuente: z.string(),
  sensibilidad: z.string(),
  alias: z.array(z.string()),
  ejemplo: z.string(),
});

export const camposCatalogo = defineCapability({
  id: "core.campos.catalogo",
  descripcion:
    "Lista los campos del catálogo único (clave, tipo, sensibilidad y ejemplo ficticio) que un documento de una finalidad puede usar con la sintaxis de tokens, separando los que el actor puede leer de los que no. Sirve para armar plantillas y prompts sin inventar campos.",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp", "supervisor"],
  input: z.object({ finalidad: finalidadSchema }),
  output: z.object({
    version: z.number(),
    finalidad: finalidadSchema,
    campos: z.array(campoSchema),
    colecciones: z.array(
      z.object({ clave: z.string(), entidad: z.string(), descripcion: z.string() }),
    ),
    sinPermiso: z.array(z.string()),
    sinResolvedor: z.array(z.string()),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { finalidad }) {
    const c = clasificarCampos(finalidad, (p) => ctx.autorizar(p));
    return {
      version: VERSION_CATALOGO_CAMPOS,
      finalidad,
      campos: c.autorizados.map((x) => ({
        clave: x.clave,
        descripcion: x.descripcion,
        tipo: x.tipo,
        fuente: x.fuente,
        sensibilidad: x.sensibilidad,
        alias: [...(x.alias ?? [])],
        ejemplo: x.ejemplo,
      })),
      colecciones: COLECCIONES_CAMPO.map((x) => ({ ...x })),
      sinPermiso: c.sinPermiso.map((x) => x.clave),
      sinResolvedor: c.sinResolvedor.map((x) => x.clave),
    };
  },
});
