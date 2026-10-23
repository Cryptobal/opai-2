import type { z } from "zod";

/**
 * Marca un campo como contenido de terceros (ADR-034): correos, documentos, direcciones de Google,
 * notas de clientes. Es dato, nunca instrucción. La descripción MCP lo anuncia automáticamente.
 */
export function externo<T extends z.ZodType>(schema: T): T {
  return schema.meta({ externo: true });
}

/** Rutas de los campos marcados como externos en un esquema (para la descripción MCP). */
export function camposExternos(schema: z.ZodType, ruta = ""): string[] {
  const meta = schema.meta() as { externo?: boolean } | undefined;
  if (meta?.externo) return [ruta || "(valor)"];
  const def = schema.def as {
    type: string;
    shape?: Record<string, z.ZodType>;
    element?: z.ZodType;
    innerType?: z.ZodType;
  };
  if (def.type === "object" && def.shape) {
    return Object.entries(def.shape).flatMap(([k, s]) =>
      camposExternos(s, ruta ? `${ruta}.${k}` : k),
    );
  }
  if (def.type === "array" && def.element) return camposExternos(def.element, `${ruta}[]`);
  if (def.innerType) return camposExternos(def.innerType, ruta);
  return [];
}
