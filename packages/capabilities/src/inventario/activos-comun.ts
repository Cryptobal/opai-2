// Activos de Inventario (CAR-236): esquema de salida y vista compartidos por sus capacidades.
import { ESTADOS_ACTIVO } from "@opai/domain";
import { z } from "zod";

import { campoSchema } from "./comun";

export const activoSchema = z.object({
  id: z.string(),
  tipoId: z.string(),
  tipo: z.string().describe("Nombre del tipo."),
  codigo: z.string(),
  numeroSerie: z.string().nullable(),
  estado: z.enum(ESTADOS_ACTIVO),
  valores: z.record(z.string(), z.union([z.string(), z.number()])),
  notas: z.string().nullable(),
  bajaEn: z.string().nullable(),
  motivoBaja: z.string().nullable(),
});
export type VistaActivo = z.infer<typeof activoSchema>;

/** Ficha del activo: además trae los campos propios de su tipo, para mostrar etiquetas. */
export const fichaActivoSchema = activoSchema.extend({ campos: z.array(campoSchema) });

type FilaActivo = {
  id: string;
  tipoId: string;
  codigo: string;
  numeroSerie: string | null;
  estado: string;
  valores: unknown;
  notas: string | null;
  bajaEn: Date | null;
  motivoBaja: string | null;
};

const valoresSchema = z.record(z.string(), z.union([z.string(), z.number()]));

export function vistaActivo(f: FilaActivo, tipo: string): VistaActivo {
  const estado = ESTADOS_ACTIVO.find((e) => e === f.estado) ?? "disponible";
  const valores = valoresSchema.safeParse(f.valores);
  return {
    id: f.id,
    tipoId: f.tipoId,
    tipo,
    codigo: f.codigo,
    numeroSerie: f.numeroSerie,
    estado,
    valores: valores.success ? valores.data : {},
    notas: f.notas,
    bajaEn: f.bajaEn ? f.bajaEn.toISOString() : null,
    motivoBaja: f.motivoBaja,
  };
}
