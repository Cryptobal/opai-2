import { z } from "zod";

import { TIPOS_MARCA } from "../domain";

export const vistaContingenciaSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  personaNombre: z.string(),
  instalacionId: z.string(),
  instalacionNombre: z.string(),
  tipo: z.enum(TIPOS_MARCA),
  tipoEtiqueta: z.string(),
  horaDeclarada: z.string(),
  motivo: z.string(),
  estado: z.enum(["pendiente", "aceptada", "rechazada"]),
  evidenciaDocumentoId: z.string().nullable(),
  marcaId: z.string().nullable(),
});

export const alcanceContingencias = (alcance: { instalaciones: readonly string[] } | null) =>
  alcance ? { instalacionId: { in: [...alcance.instalaciones] } } : {};