// Catálogo de campos personalizados de cuentas, contactos y negocios (CAR-27, PR 1).
// Leer el catálogo es de quien ve cuentas; definirlo es de owner y admin (core:campos.config).
import { z } from "zod";

import {
  ENTIDADES_CAMPO_PERSONALIZADO,
  MAX_OPCIONES_CAMPO,
  PERMISOS_CORE,
  TIPOS_CAMPO_PERSONALIZADO,
  claveCampoPersonalizado,
  normalizarOpcionesCampo,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import type { Contexto } from "../../types";
import { cursorDe, pagina, sinDuplicado } from "../maestros/comun";

export const campoPersonalizadoSchema = z.object({
  id: z.string(),
  entidad: z.enum(ENTIDADES_CAMPO_PERSONALIZADO),
  clave: z.string(),
  etiqueta: z.string(),
  tipo: z.enum(TIPOS_CAMPO_PERSONALIZADO),
  opciones: z.array(z.string()),
  obligatorio: z.boolean(),
  orden: z.number().int(),
  activo: z.boolean(),
});
export type CampoPersonalizadoVista = z.infer<typeof campoPersonalizadoSchema>;

export const etiquetaCampo = z.string().trim().min(1).max(60);
export const opcionesCampo = z.array(z.string().max(100)).max(MAX_OPCIONES_CAMPO);

type Fila = Omit<CampoPersonalizadoVista, "entidad" | "tipo"> & { entidad: string; tipo: string };
export const vistaCampo = (c: Fila): CampoPersonalizadoVista => ({
  id: c.id,
  entidad: c.entidad as CampoPersonalizadoVista["entidad"],
  clave: c.clave,
  etiqueta: c.etiqueta,
  tipo: c.tipo as CampoPersonalizadoVista["tipo"],
  opciones: c.opciones,
  obligatorio: c.obligatorio,
  orden: c.orden,
  activo: c.activo,
});

/** Opciones limpias; una lista sin opciones no se puede guardar (el CHECK de la base también lo exige). */
export function opcionesPara(tipo: string, opciones: readonly string[] | undefined): string[] {
  if (tipo !== "lista") return [];
  const limpias = normalizarOpcionesCampo(opciones ?? []);
  if (limpias.length === 0) throw reglaDeNegocio("Un campo de tipo lista necesita al menos una opción.");
  return limpias;
}

const DUPLICADO = "Ya existe un campo con ese nombre para esa entidad.";

export const camposPersonalizadosList = defineCapability({
  auditarLectura: (s) => s.items.map((c) => c.id),
  id: "core.campos_personalizados.list",
  descripcion:
    "Campos personalizados que la empresa definió para cuentas, contactos o negocios, en su orden de ficha (activos por defecto). No son los tokens de documentos de core.campos.catalogo.",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp"],
  input: z.object({
    entidad: z.enum(ENTIDADES_CAMPO_PERSONALIZADO).optional(),
    incluirArchivados: z.boolean().default(false),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(200).default(200),
  }),
  output: z.object({ items: z.array(campoPersonalizadoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.campoPersonalizado.findMany({
      where: {
        ...(input.entidad ? { entidad: input.entidad } : {}),
        ...(input.incluirArchivados ? {} : { activo: true }),
      },
      orderBy: [{ entidad: "asc" }, { orden: "asc" }, { id: "asc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    return pagina(filas.map(vistaCampo), input.limite, input.cursor);
  },
});

export const camposPersonalizadosCreate = defineCapability({
  id: "core.campos_personalizados.create",
  descripcion:
    "Define un campo personalizado nuevo para las fichas de cuentas, contactos o negocios: texto, número, fecha, lista de opciones o sí/no.",
  permiso: PERMISOS_CORE.camposConfig,
  input: z.object({
    entidad: z.enum(ENTIDADES_CAMPO_PERSONALIZADO),
    etiqueta: etiquetaCampo,
    tipo: z.enum(TIPOS_CAMPO_PERSONALIZADO),
    opciones: opcionesCampo.optional(),
    obligatorio: z.boolean().default(false),
  }),
  output: campoPersonalizadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const clave = claveCampoPersonalizado(input.etiqueta);
    const opciones = opcionesPara(input.tipo, input.opciones);
    const orden = await siguienteOrden(ctx, input.entidad);
    const datos = { ...input, clave, opciones, orden, activo: true };
    if (dryRun) return vistaCampo({ id: "", ...datos });
    const c = await ctx.transaccion(async (tx) => {
      const nuevo = await sinDuplicado(
        tx.campoPersonalizado.create({ data: { tenantId: ctx.tenantId, ...datos } }),
        DUPLICADO,
      );
      await ctx.eventos.emitir(tx, {
        tipo: "core.campo_personalizado.creado",
        entidadTipo: "campo_personalizado",
        entidadId: nuevo.id,
        payload: {},
      });
      return nuevo;
    });
    return vistaCampo(c);
  },
});

async function siguienteOrden(ctx: Contexto, entidad: string): Promise<number> {
  const ultimo = await ctx.db.campoPersonalizado.findFirst({
    where: { entidad },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  return (ultimo?.orden ?? -1) + 1;
}
