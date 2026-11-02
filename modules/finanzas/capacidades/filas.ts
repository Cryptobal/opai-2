import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { filaSchema, seccionSchema, sinDuplicado, uuidSchema, vistaFila } from "./esquemas";
import { PERMISO_CONFIGURAR } from "./permisos";
import { filaDe, ID_VISTA_PREVIA } from "./util";

const datosFila = {
  etiqueta: z.string().trim().min(2).max(120),
  vinculo: z
    .string()
    .trim()
    .max(200)
    .optional()
    .describe("Origen de la cifra: cuenta, instalación o centro de costo."),
  arrastre: z
    .boolean()
    .default(false)
    .describe("Si es true, al reprogramar se mueven también las celdas plan posteriores."),
};

export const filasCrear = defineCapability({
  id: "finanzas.filas.crear",
  descripcion:
    "Agrega una fila de ingreso o egreso a la planilla del flujo de caja, con el origen de su cifra y si arrastra las semanas siguientes al reprogramar.",
  permiso: PERMISO_CONFIGURAR,
  input: z.object({
    seccion: seccionSchema,
    ...datosFila,
    orden: z.number().int().min(0).max(1000).default(0),
  }),
  output: filaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const data = {
      seccion: input.seccion,
      etiqueta: input.etiqueta,
      vinculo: input.vinculo ?? null,
      arrastre: input.arrastre,
      orden: input.orden,
      activa: true,
    };
    if (dryRun) return vistaFila({ id: ID_VISTA_PREVIA, ...data });
    const creada = await ctx.transaccion(async (tx) => {
      const f = await sinDuplicado(
        tx.flujoFila.create({ data: { ...data, tenantId: ctx.tenantId } }),
        `Ya existe una fila llamada "${input.etiqueta}".`,
      );
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.fila_creada",
        entidadTipo: "flujoFila",
        entidadId: f.id,
      });
      return f;
    });
    return vistaFila(creada);
  },
});

export const filasActualizar = defineCapability({
  id: "finanzas.filas.actualizar",
  descripcion:
    "Cambia una fila de la planilla del flujo de caja: nombre, origen de la cifra, regla de arrastre, orden o si está activa. Las celdas ya cargadas se conservan.",
  permiso: PERMISO_CONFIGURAR,
  input: z.object({
    id: uuidSchema,
    etiqueta: datosFila.etiqueta.optional(),
    vinculo: datosFila.vinculo,
    arrastre: z.boolean().optional(),
    orden: z.number().int().min(0).max(1000).optional(),
    activa: z.boolean().optional(),
  }),
  output: filaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await filaDe(ctx, input.id);
    const { id, ...cambios } = input;
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    if (dryRun) return vistaFila({ ...actual, ...data });
    const f = await ctx.transaccion(async (tx) => {
      const r = await sinDuplicado(
        tx.flujoFila.update({ where: { id }, data }),
        `Ya existe una fila llamada "${input.etiqueta}".`,
      );
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.fila_actualizada",
        entidadTipo: "flujoFila",
        entidadId: id,
      });
      return r;
    });
    return vistaFila(f);
  },
});

export const filasArchivar = defineCapability({
  id: "finanzas.filas.archivar",
  descripcion:
    "Archiva o restaura una fila del flujo de caja: deja de mostrarse en la planilla sin borrar sus celdas.",
  permiso: PERMISO_CONFIGURAR,
  input: z.object({ id: uuidSchema, archivar: z.boolean().default(true) }),
  output: filaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await filaDe(ctx, input.id);
    const activa = !input.archivar;
    if (dryRun) return vistaFila({ ...actual, activa });
    const f = await ctx.transaccion(async (tx) => {
      const r = await tx.flujoFila.update({ where: { id: input.id }, data: { activa } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.fila_archivada",
        entidadTipo: "flujoFila",
        entidadId: input.id,
        payload: { archivada: input.archivar },
      });
      return r;
    });
    return vistaFila(f);
  },
});
