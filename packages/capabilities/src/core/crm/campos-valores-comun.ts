// Leer y guardar los valores de los campos personalizados de una ficha (CAR-27, PR 2).
// Quien llama ya verificó permiso y alcance de la ficha; aquí solo se valida contra el catálogo.
import { z } from "zod";

import {
  type ENTIDADES_CAMPO_PERSONALIZADO,
  TIPOS_CAMPO_PERSONALIZADO,
  validarValorCampo,
  type TipoCampoPersonalizado,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { sinDuplicado } from "../maestros/comun";

export type EntidadCampo = (typeof ENTIDADES_CAMPO_PERSONALIZADO)[number];
export type FichaCampos = { entidad: EntidadCampo; id: string };

const COLUMNA = { cuenta: "cuentaId", contacto: "contactoId", negocio: "negocioId" } as const;

const valorSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const valorCampoSchema = z.object({
  campoId: z.string(),
  clave: z.string(),
  etiqueta: z.string(),
  tipo: z.enum(TIPOS_CAMPO_PERSONALIZADO),
  opciones: z.array(z.string()),
  obligatorio: z.boolean(),
  valor: valorSchema,
});
export const valoresSalida = z.object({ campos: z.array(valorCampoSchema) });
export const valoresEntrada = z
  .record(z.string().max(40), valorSchema)
  .refine((v) => Object.keys(v).length <= 50, "Máximo 50 campos por vez.")
  .describe("Clave del campo → valor. Solo cambian las claves enviadas; null borra el valor.");

type Valor = z.infer<typeof valorSchema>;
type Salida = z.infer<typeof valoresSalida>;

async function camposActivos(ctx: Contexto, entidad: EntidadCampo) {
  return ctx.db.campoPersonalizado.findMany({
    where: { entidad, activo: true },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    take: 200,
  });
}

function armar(
  campos: Awaited<ReturnType<typeof camposActivos>>,
  valores: ReadonlyMap<string, Valor>,
): Salida {
  return {
    campos: campos.map((c) => ({
      campoId: c.id,
      clave: c.clave,
      etiqueta: c.etiqueta,
      tipo: c.tipo as TipoCampoPersonalizado,
      opciones: c.opciones,
      obligatorio: c.obligatorio,
      valor: valores.get(c.id) ?? null,
    })),
  };
}

export async function leerValores(ctx: Contexto, ficha: FichaCampos): Promise<Salida> {
  const campos = await camposActivos(ctx, ficha.entidad);
  const filas = await ctx.db.campoValor.findMany({
    where: { [COLUMNA[ficha.entidad]]: ficha.id, campoId: { in: campos.map((c) => c.id) } },
  });
  return armar(campos, new Map(filas.map((f) => [f.campoId, f.valor as Valor])));
}

export async function guardarValores(
  ctx: Contexto,
  ficha: FichaCampos,
  entrada: Record<string, Valor>,
  dryRun: boolean,
): Promise<Salida> {
  const campos = await camposActivos(ctx, ficha.entidad);
  const porClave = new Map(campos.map((c) => [c.clave, c]));
  const errores: Record<string, string> = {};
  const cambios: { campoId: string; valor: Valor }[] = [];
  for (const [clave, bruto] of Object.entries(entrada)) {
    const campo = porClave.get(clave);
    if (!campo) {
      errores[clave] = "No existe un campo activo con esa clave.";
      continue;
    }
    const r = validarValorCampo(campo.tipo as TipoCampoPersonalizado, campo.opciones, bruto);
    if (!r.ok) errores[clave] = r.error;
    else if (r.valor === null && campo.obligatorio) errores[clave] = "Es obligatorio.";
    else cambios.push({ campoId: campo.id, valor: r.valor });
  }
  if (Object.keys(errores).length > 0)
    throw reglaDeNegocio("Hay valores que no se pueden guardar.", { errores });

  const actual = await leerValores(ctx, ficha);
  const mapa = new Map<string, Valor>(actual.campos.map((c) => [c.campoId, c.valor]));
  for (const c of cambios) mapa.set(c.campoId, c.valor);
  if (dryRun || cambios.length === 0) return armar(campos, mapa);

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
  return armar(campos, mapa);
}
