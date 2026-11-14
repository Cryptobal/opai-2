import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { CADENA_POR_DEFECTO, PLAZO_ATENCION_POR_DEFECTO_MIN } from "../domain/cadena";
import { cursorDe, listaSchema, pagina, severidadSchema, uuidSchema } from "./esquemas";
import { pasoSchema } from "./motor";

export const PERMISO_CONFIG = "central:config.manage";

const cadenaSchema = z.object({
  id: uuidSchema.nullable().describe("null = la plantilla por defecto de la vertical."),
  instalacionId: uuidSchema.nullable(),
  severidad: severidadSchema.nullable(),
  pasos: z.array(pasoSchema),
  plazoAtencionMin: z.number().int(),
});

export const cadenasListar = defineCapability({
  auditarLectura: (s) => s.items.flatMap((c) => (c.id ? [c.id] : [])),
  id: "central.cadenas.listar",
  descripcion:
    "Lista las cadenas de escalamiento de la empresa (por instalación y severidad) y la plantilla por defecto que rige cuando ninguna calza.",
  permiso: "central:alertas.ver",
  input: listaSchema,
  output: z.object({ items: z.array(cadenaSchema), siguiente: z.string().nullable(), plantilla: cadenaSchema }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.centralCadena.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], ...cursorDe(input.cursor, input.limite) });
    const p = pagina(filas, input.limite, input.cursor);
    return {
      items: p.items.map((c) => ({
        id: c.id,
        instalacionId: c.instalacionId,
        severidad: c.severidad as z.infer<typeof severidadSchema> | null,
        pasos: z.array(pasoSchema).parse(c.pasos),
        plazoAtencionMin: c.plazoAtencionMin,
      })),
      siguiente: p.siguiente,
      plantilla: { id: null, instalacionId: null, severidad: null, pasos: [...CADENA_POR_DEFECTO], plazoAtencionMin: PLAZO_ATENCION_POR_DEFECTO_MIN },
    };
  },
});

export const cadenasGuardar = defineCapability({
  id: "central.cadenas.guardar",
  descripcion:
    "Crea o reemplaza la cadena de escalamiento de la empresa, de una instalación o de una severidad: pasos con a quién contactar, por qué canal, cuánto esperar y si exige «me hago cargo».",
  permiso: PERMISO_CONFIG,
  // R10: cambiar una cadena es de aprobación humana para cualquier agente.
  exigeAprobacion: () => true,
  input: z.object({
    instalacionId: uuidSchema.nullable().default(null),
    severidad: severidadSchema.nullable().default(null),
    pasos: z.array(pasoSchema).min(1).max(6),
    plazoAtencionMin: z.number().int().min(5).max(1440).default(PLAZO_ATENCION_POR_DEFECTO_MIN),
  }),
  output: z.object({ id: uuidSchema.nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (i.instalacionId && !(await ctx.db.instalacion.findFirst({ where: { id: i.instalacionId }, select: { id: true } })))
      throw noEncontrado("La instalación");
    for (const p of i.pasos)
      if (p.destinatario.tipo === "usuario" && !(await ctx.db.membership.findFirst({ where: { userId: p.destinatario.usuarioId }, select: { id: true } })))
        throw noEncontrado("La persona de un paso");
    const existente = await ctx.db.centralCadena.findFirst({ where: { instalacionId: i.instalacionId, severidad: i.severidad } });
    if (dryRun) return { id: existente?.id ?? null };
    const datos = { pasos: i.pasos, plazoAtencionMin: i.plazoAtencionMin };
    const c = await ctx.transaccion((tx) =>
      existente
        ? tx.centralCadena.update({ where: { id: existente.id }, data: datos })
        : tx.centralCadena.create({ data: { tenantId: ctx.tenantId, instalacionId: i.instalacionId, severidad: i.severidad, ...datos } }),
    );
    return { id: c.id };
  },
});
