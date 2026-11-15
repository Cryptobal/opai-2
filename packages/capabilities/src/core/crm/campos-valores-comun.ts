// Leer y guardar los valores de los campos personalizados de una ficha (CAR-27, CAR-536).
// Quien llama ya verificó permiso y alcance de la ficha; aquí solo se valida contra el catálogo.
import { z } from "zod";

import {
  FORMATOS_NUMERO_CAMPO,
  TIPOS_CAMPO_PERSONALIZADO,
  type EntidadCampoPersonalizado,
  type FormatoNumeroCampo,
  type TipoCampoPersonalizado,
} from "@opai/domain";

import type { Contexto } from "../../types";
import { sinDuplicado } from "../maestros/comun";
import { opcionSchema, opcionesDe, valorSchema } from "./campos-definicion";
import { validarEntrada, type CampoActivo } from "./campos-valores-validar";
import { usuariosErp } from "./usuarios-erp";

export type FichaCampos = { entidad: EntidadCampoPersonalizado; id: string };

const COLUMNA = {
  cuenta: "cuentaId",
  contacto: "contactoId",
  negocio: "negocioId",
  instalacion: "instalacionId",
  persona: "personaId",
} as const satisfies Record<EntidadCampoPersonalizado, string>;

const valorCampoSchema = z.object({
  campoId: z.string(),
  clave: z.string(),
  etiqueta: z.string(),
  descripcion: z.string().nullable(),
  tipo: z.enum(TIPOS_CAMPO_PERSONALIZADO),
  formato: z.enum(FORMATOS_NUMERO_CAMPO).nullable(),
  opciones: z.array(opcionSchema).describe("En campos de usuario: los usuarios del ERP (valor = id)."),
  obligatorio: z.boolean(),
  valorDefecto: valorSchema,
  valor: valorSchema,
});
export const valoresSalida = z.object({ campos: z.array(valorCampoSchema) });
export const valoresEntrada = z
  .record(z.string().max(40), valorSchema)
  .refine((v) => Object.keys(v).length <= 50, "Máximo 50 campos por vez.")
  .describe("Clave del campo → valor. Solo cambian las claves enviadas; null borra el valor.");

type Valor = z.infer<typeof valorSchema>;
type Salida = z.infer<typeof valoresSalida>;

async function camposActivos(ctx: Contexto, entidad: EntidadCampoPersonalizado) {
  return ctx.db.campoPersonalizado.findMany({
    where: { entidad, activo: true },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    take: 200,
  });
}

async function armar(ctx: Contexto, campos: CampoActivo[], valores: ReadonlyMap<string, Valor>): Promise<Salida> {
  const usuarios = campos.some((c) => c.tipo === "usuario")
    ? (await usuariosErp(ctx)).map((u) => ({ valor: u.id, etiqueta: u.nombre }))
    : [];
  return {
    campos: campos.map((c) => ({
      campoId: c.id,
      clave: c.clave,
      etiqueta: c.etiqueta,
      descripcion: c.descripcion,
      tipo: c.tipo as TipoCampoPersonalizado,
      formato: c.formato as FormatoNumeroCampo | null,
      opciones: c.tipo === "usuario" ? usuarios : opcionesDe(c),
      obligatorio: c.obligatorio,
      valorDefecto: (c.valorDefecto ?? null) as Valor,
      valor: valores.get(c.id) ?? null,
    })),
  };
}

async function valoresGuardados(ctx: Contexto, ficha: FichaCampos, campos: CampoActivo[]) {
  const filas = await ctx.db.campoValor.findMany({
    where: { [COLUMNA[ficha.entidad]]: ficha.id, campoId: { in: campos.map((c) => c.id) } },
  });
  return new Map(filas.map((f) => [f.campoId, f.valor as Valor]));
}

export async function leerValores(ctx: Contexto, ficha: FichaCampos): Promise<Salida> {
  const campos = await camposActivos(ctx, ficha.entidad);
  return armar(ctx, campos, await valoresGuardados(ctx, ficha, campos));
}

export async function guardarValores(
  ctx: Contexto,
  ficha: FichaCampos,
  entrada: Record<string, Valor>,
  dryRun: boolean,
): Promise<Salida> {
  const campos = await camposActivos(ctx, ficha.entidad);
  const cambios = await validarEntrada(ctx, campos, entrada);
  const mapa = await valoresGuardados(ctx, ficha, campos);
  for (const c of cambios) mapa.set(c.campoId, c.valor);
  if (dryRun || cambios.length === 0) return armar(ctx, campos, mapa);

  const col = COLUMNA[ficha.entidad];
  await ctx.transaccion(async (tx) => {
    for (const { campoId, valor } of cambios) {
      const donde = { campoId, [col]: ficha.id };
      if (valor === null) {
        await tx.campoValor.deleteMany({ where: donde });
        continue;
      }
      const previo = await tx.campoValor.findFirst({ where: donde, select: { id: true } });
      await sinDuplicado(
        previo
          ? tx.campoValor.update({ where: { id: previo.id }, data: { valor } })
          : tx.campoValor.create({ data: { tenantId: ctx.tenantId, ...donde, valor } }),
        "Otro usuario guardó este campo al mismo tiempo; vuelve a intentarlo.",
      );
    }
    await ctx.eventos.emitir(tx, {
      tipo: "core.campos_personalizados.valores_guardados",
      entidadTipo: ficha.entidad,
      entidadId: ficha.id,
      payload: { claves: Object.keys(entrada) },
    });
  });
  return armar(ctx, campos, mapa);
}
