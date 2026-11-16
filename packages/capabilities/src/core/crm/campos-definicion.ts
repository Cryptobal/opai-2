// Definición de un campo personalizado (CAR-27, CAR-536): esquemas del borde, vista y armado de las
// columnas que dependen del tipo (opciones con etiqueta y valor, formato y valor por defecto).
import { z } from "zod";

import {
  ENTIDADES_CAMPO_PERSONALIZADO,
  FICHAS_CAMPO_PERSONALIZADO,
  FORMATOS_NUMERO_CAMPO,
  MAX_OPCIONES_CAMPO,
  TIPOS_CAMPO_PERSONALIZADO,
  TIPOS_CON_OPCIONES,
  entidadesCampoActivas,
  normalizarOpcionesCampo,
  validarValorCampo,
  type EntidadCampoPersonalizado,
  type FormatoNumeroCampo,
  type OpcionCampo,
  type TipoCampoPersonalizado,
  type ValorCampoPersonalizado,
} from "@opai/domain";

import { prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

export const valorSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string()).max(50), z.null()]);
export const opcionSchema = z.object({ valor: z.string(), etiqueta: z.string() });

export const campoPersonalizadoSchema = z.object({
  id: z.string(),
  entidad: z.enum(ENTIDADES_CAMPO_PERSONALIZADO),
  clave: z.string(),
  etiqueta: z.string(),
  descripcion: z.string().nullable(),
  tipo: z.enum(TIPOS_CAMPO_PERSONALIZADO),
  formato: z.enum(FORMATOS_NUMERO_CAMPO).nullable(),
  opciones: z.array(opcionSchema),
  valorDefecto: valorSchema,
  obligatorio: z.boolean(),
  orden: z.number().int(),
  activo: z.boolean(),
});
export type CampoPersonalizadoVista = z.infer<typeof campoPersonalizadoSchema>;

const textoOpcion = z.string().trim().max(100);
export const etiquetaCampo = z.string().trim().min(1).max(60);
/** Campos de la definición que dependen del tipo; los comparten crear y editar. */
export const definicionEntrada = {
  descripcion: z.string().trim().max(300).nullable().optional().describe("Ayuda que se muestra bajo el campo."),
  formato: z.enum(FORMATOS_NUMERO_CAMPO).nullable().optional().describe("Solo números."),
  opciones: z
    .array(z.union([textoOpcion, z.object({ valor: textoOpcion.optional(), etiqueta: textoOpcion })]))
    .max(MAX_OPCIONES_CAMPO)
    .optional()
    .describe("Desplegable, radio o casillas, en orden. Sin `valor`, el valor interno es la etiqueta."),
  valorDefecto: valorSchema.optional().describe("Se propone al llenar la ficha; se valida por tipo."),
};

export type FilaCampo = {
  id: string;
  entidad: string;
  clave: string;
  etiqueta: string;
  descripcion: string | null;
  tipo: string;
  formato: string | null;
  opciones: string[];
  opcionesEtiquetas: string[];
  valorDefecto: unknown;
  obligatorio: boolean;
  orden: number;
  activo: boolean;
};

/** Opciones con su etiqueta; las de antes de CAR-536 no tienen etiqueta y muestran el valor. */
export const opcionesDe = (c: Pick<FilaCampo, "opciones" | "opcionesEtiquetas">): OpcionCampo[] =>
  c.opciones.map((valor, i) => ({ valor, etiqueta: c.opcionesEtiquetas[i] ?? valor }));

export const vistaCampo = ({ opcionesEtiquetas, ...c }: FilaCampo): CampoPersonalizadoVista => ({
  ...c,
  entidad: c.entidad as EntidadCampoPersonalizado,
  tipo: c.tipo as TipoCampoPersonalizado,
  formato: c.formato as FormatoNumeroCampo | null,
  opciones: opcionesDe({ opciones: c.opciones, opcionesEtiquetas }),
  valorDefecto: (c.valorDefecto ?? null) as ValorCampoPersonalizado,
});

/** Rechaza una ficha cuyo módulo no está activo en la empresa (sus campos no se ofrecen). */
export function exigirFichaActiva(ctx: Contexto, entidad: EntidadCampoPersonalizado): void {
  if (!entidadesCampoActivas(ctx.modulosActivos).includes(entidad))
    throw prohibido(`Las fichas de ${FICHAS_CAMPO_PERSONALIZADO[entidad].nombre.toLowerCase()} no están disponibles: su módulo no está activo.`);
}

type Definicion = {
  formato?: FormatoNumeroCampo | null | undefined;
  opciones?: z.infer<typeof definicionEntrada.opciones>;
  valorDefecto?: unknown;
};

/** Columnas de la definición según el tipo: lo que no aplica al tipo queda vacío. */
export function columnasDefinicion(tipo: TipoCampoPersonalizado, d: Definicion) {
  const conOpciones = TIPOS_CON_OPCIONES.includes(tipo);
  const opciones = conOpciones ? normalizarOpcionesCampo(d.opciones ?? []) : [];
  if (conOpciones && opciones.length === 0)
    throw reglaDeNegocio("Un campo con opciones necesita al menos una opción.");
  const formato = tipo === "numero" ? (d.formato ?? null) : null;
  if (tipo === "usuario" && d.valorDefecto != null)
    throw reglaDeNegocio("Un campo de usuario no lleva valor por defecto.");
  const defecto = validarValorCampo({ tipo, formato, opciones: opciones.map((o) => o.valor) }, d.valorDefecto);
  if (!defecto.ok) throw reglaDeNegocio(`Valor por defecto: ${defecto.error}`);
  return {
    formato,
    opciones: opciones.map((o) => o.valor),
    opcionesEtiquetas: opciones.map((o) => o.etiqueta),
    valorDefecto: defecto.valor,
  };
}
