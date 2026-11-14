// Módulo Inventario (CAR-235, ADR-116): piezas compartidas por sus capacidades.
import { CATEGORIAS_TIPO, LIMITES_TIPO, TIPOS_CAMPO_INVENTARIO, type CampoTipo } from "@opai/domain";
import { z } from "zod";

/** Permisos del módulo Inventario (declarados en su manifiesto). */
export const PERMISOS_INVENTARIO = {
  /** Ver tipos, activos y existencias. */
  read: "inventario:read",
  /** Configurar el catálogo de tipos de la empresa. */
  tiposManage: "inventario:tipos.manage",
} as const;

export const campoSchema = z.object({
  clave: z.string(),
  etiqueta: z.string(),
  tipo: z.enum(TIPOS_CAMPO_INVENTARIO),
  obligatorio: z.boolean(),
});

/** Campo tal como llega: la clave solo viene en los que ya existían. */
export const campoEntradaSchema = z.object({
  clave: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,39}$/)
    .optional()
    .describe("Clave de un campo existente; se omite en los campos nuevos."),
  etiqueta: z.string().trim().min(LIMITES_TIPO.etiquetaMin).max(LIMITES_TIPO.etiquetaMax),
  tipo: z.enum(TIPOS_CAMPO_INVENTARIO).default("texto"),
  obligatorio: z.boolean().default(false),
});

export const tallaSchema = z.string().trim().min(1).max(LIMITES_TIPO.tallaMax);

export const tipoSchema = z.object({
  id: z.string(),
  categoria: z.enum(CATEGORIAS_TIPO),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  campos: z.array(campoSchema),
  tallas: z.array(z.string()),
  prendaClave: z.string().nullable(),
  activo: z.boolean(),
});
export type VistaTipo = z.infer<typeof tipoSchema>;

type FilaTipo = {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string | null;
  campos: unknown;
  tallas: string[];
  prendaClave: string | null;
  activo: boolean;
};

/** Lee los campos guardados; descarta lo que no tenga la forma esperada. */
export function camposGuardados(valor: unknown): CampoTipo[] {
  const r = z.array(campoSchema).safeParse(valor);
  return r.success ? r.data : [];
}

export function vistaTipo(f: FilaTipo): VistaTipo {
  return {
    id: f.id,
    categoria: f.categoria === "ropa" ? "ropa" : "activo",
    nombre: f.nombre,
    descripcion: f.descripcion,
    campos: camposGuardados(f.campos),
    tallas: f.tallas,
    prendaClave: f.prendaClave,
    activo: f.activo,
  };
}

export const ID_VISTA_PREVIA = "00000000-0000-7000-8000-000000000000";
