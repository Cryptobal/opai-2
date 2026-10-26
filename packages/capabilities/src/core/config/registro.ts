import { type z } from "zod";

/** Metadatos de un ajuste (Zod 4 `.meta()`, ADR-018 y ADR-038). */
export type MetaAjuste = {
  etiqueta: string;
  ayuda?: string;
  grupo?: string;
  /** Quién lo fija: el tenant, cada usuario o solo OPAI (plataforma). */
  ambito: "tenant" | "usuario" | "plataforma";
  /** Permiso para cambiarlo en ámbito tenant (por defecto core:config.manage). */
  permiso?: string;
  /** Lo irreversible lo decide una persona: un agente (API key/MCP) no puede cambiarlo (ADR-034). */
  soloPersonas?: boolean;
  control?: "texto" | "numero" | "switch" | "seleccion" | "lista" | "color" | "fecha" | "json";
};

export type CampoAjuste = { modulo: string; clave: string; schema: z.ZodType; meta: MetaAjuste };

const AMBITOS = ["tenant", "usuario", "plataforma"];

function esMeta(m: unknown): m is MetaAjuste {
  const x = m as Partial<MetaAjuste> | undefined;
  return !!x && typeof x.etiqueta === "string" && AMBITOS.includes(String(x.ambito));
}

/**
 * Declara los ajustes de un módulo: cada campo del objeto lleva `.default()` y `.meta()` con
 * etiqueta y ámbito. Falla al declarar (no en producción) si falta algo.
 */
export function defineAjustes(modulo: string, schema: z.ZodObject): CampoAjuste[] {
  return Object.entries(schema.shape).map(([clave, campo]) => {
    const c = campo as z.ZodType;
    const meta = c.meta();
    if (!esMeta(meta))
      throw new Error(`Ajuste ${modulo}.${clave}: falta .meta({ etiqueta, ambito }).`);
    if (!c.safeParse(undefined).success)
      throw new Error(`Ajuste ${modulo}.${clave}: falta .default().`);
    return { modulo, clave, schema: c, meta };
  });
}

export const valorPorDefecto = (c: CampoAjuste): unknown => c.schema.parse(undefined);
