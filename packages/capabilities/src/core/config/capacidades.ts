import { z } from "zod";

import { defineCapability } from "../../define";
import { camposVisibles, valoresEfectivos } from "./valores";
import { descripcionCampo, describir } from "./vista";

const filtro = z.object({
  modulo: z.string().optional().describe("Solo los ajustes de un módulo."),
});

export const configSchema = defineCapability({
  id: "core.config.schema",
  descripcion:
    "Esquema de los ajustes de la empresa y del usuario (núcleo y módulos activos): etiqueta, ayuda, grupo, ámbito, control y JSON Schema del valor, para formularios y agentes.",
  permiso: null,
  input: filtro,
  output: z.array(descripcionCampo),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => camposVisibles(ctx, input.modulo).map((c) => describir(ctx, c)),
});

export const configGet = defineCapability({
  id: "core.config.get",
  descripcion:
    "Valores efectivos de los ajustes (por defecto → plataforma → empresa → usuario) con su origen. Sin permiso de configuración, solo las preferencias propias.",
  permiso: null,
  input: filtro,
  output: z.array(
    z.object({ modulo: z.string(), clave: z.string(), valor: z.unknown(), origen: z.string() }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const campos = camposVisibles(ctx, input.modulo);
    const valores = await valoresEfectivos(ctx, campos);
    return campos.map((c) => ({
      modulo: c.modulo,
      clave: c.clave,
      ...(valores.get(`${c.modulo}.${c.clave}`) ?? { valor: null, origen: "defecto" }),
    }));
  },
});

export const configBuscar = defineCapability({
  id: "core.config.buscar",
  descripcion:
    "Busca ajustes por texto en su etiqueta, ayuda o grupo (p. ej. 'correo', 'tamaño'), para ir directo al ajuste.",
  permiso: null,
  input: z.object({ q: z.string().trim().min(2).max(80) }),
  output: z.array(descripcionCampo),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { q }) {
    const n = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    const buscado = n(q);
    return camposVisibles(ctx)
      .filter((c) =>
        n(`${c.meta.etiqueta} ${c.meta.ayuda ?? ""} ${c.meta.grupo ?? ""} ${c.clave}`).includes(
          buscado,
        ),
      )
      .map((c) => describir(ctx, c));
  },
});
