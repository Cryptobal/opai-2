// Catálogo de campos personalizados de las fichas (CAR-27, CAR-536). Leer el catálogo es de quien ve
// cuentas, instalaciones o personas; definirlo es de owner y admin (core:campos.config).
import { Prisma } from "@opai/db";
import { z } from "zod";

import {
  ENTIDADES_CAMPO_PERSONALIZADO,
  FICHAS_CAMPO_PERSONALIZADO,
  PERMISOS_CORE,
  TIPOS_CAMPO_PERSONALIZADO,
  claveCampoPersonalizado,
  entidadesCampoActivas,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import type { Contexto } from "../../types";
import { cursorDe, pagina, sinDuplicado } from "../maestros/comun";
import {
  campoPersonalizadoSchema,
  columnasDefinicion,
  definicionEntrada,
  etiquetaCampo,
  exigirFichaActiva,
  vistaCampo,
} from "./campos-definicion";

export const DUPLICADO_CAMPO = "Ya existe un campo con ese nombre para esa ficha.";
const entidadSchema = z.enum(ENTIDADES_CAMPO_PERSONALIZADO);

export const camposPersonalizadosList = defineCapability({
  auditarLectura: (s) => s.items.map((c) => c.id),
  id: "core.campos_personalizados.list",
  descripcion:
    "Campos personalizados que la empresa definió para sus fichas (cuentas, contactos, negocios, instalaciones, personas), en su orden de ficha (activos por defecto), y las fichas disponibles según los módulos activos. No son los tokens de documentos de core.campos.catalogo.",
  permiso: PERMISOS_CORE.cuentasRead,
  permisosAlternos: [PERMISOS_CORE.instalacionesRead, PERMISOS_CORE.personasRead],
  portales: ["erp"],
  input: z.object({
    entidad: entidadSchema.optional(),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(200).default(200),
    incluirArchivados: z.boolean().default(false),
  }),
  output: z.object({
    entidades: z.array(z.object({ valor: entidadSchema, nombre: z.string() })),
    items: z.array(campoPersonalizadoSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const activas = entidadesCampoActivas(ctx.modulosActivos);
    const filas = await ctx.db.campoPersonalizado.findMany({
      where: {
        entidad: input.entidad && activas.includes(input.entidad) ? input.entidad : { in: activas },
        ...(input.incluirArchivados ? {} : { activo: true }),
      },
      orderBy: [{ entidad: "asc" }, { orden: "asc" }, { id: "asc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const entidades = activas.map((e) => ({
      valor: e,
      nombre: FICHAS_CAMPO_PERSONALIZADO[e].nombre,
    }));
    return { ...pagina(filas.map(vistaCampo), input.limite, input.cursor), entidades };
  },
});

export const camposPersonalizadosCreate = defineCapability({
  id: "core.campos_personalizados.create",
  descripcion:
    "Define un campo personalizado nuevo para una ficha (cuenta, contacto, negocio, instalación o persona). Tipos: texto de una línea o multilínea, número (entero, decimal, moneda CLP o porcentaje), fecha, fecha y hora, sí/no, desplegable, radio, casillas múltiples, email, teléfono, URL, RUT o usuario de la empresa.",
  permiso: PERMISOS_CORE.camposConfig,
  input: z.object({
    entidad: entidadSchema,
    etiqueta: etiquetaCampo,
    tipo: z.enum(TIPOS_CAMPO_PERSONALIZADO),
    ...definicionEntrada,
    obligatorio: z.boolean().default(false),
  }),
  output: campoPersonalizadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { entidad, etiqueta, tipo, descripcion, obligatorio, ...def }, { dryRun }) {
    exigirFichaActiva(ctx, entidad);
    const columnas = columnasDefinicion(tipo, def);
    const orden = await siguienteOrden(ctx, entidad);
    const clave = claveCampoPersonalizado(etiqueta);
    const datos = {
      entidad,
      etiqueta,
      tipo,
      descripcion: descripcion || null,
      obligatorio,
      clave,
      orden,
      activo: true,
      ...columnas,
    };
    if (dryRun) return vistaCampo({ id: "", ...datos });
    const c = await ctx.transaccion(async (tx) => {
      const nuevo = await sinDuplicado(
        tx.campoPersonalizado.create({
          data: {
            tenantId: ctx.tenantId,
            ...datos,
            valorDefecto: datos.valorDefecto ?? Prisma.DbNull,
          },
        }),
        DUPLICADO_CAMPO,
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
