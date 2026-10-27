import { z } from "zod";

export const keySchema = z.object({
  id: z.string(),
  nombre: z.string(),
  prefijo: z.string(),
  scopes: z.array(z.string()),
  tipo: z.string(),
  permisos: z.array(z.string()).nullable(),
  responsable: z.object({ nombre: z.string(), email: z.string() }),
  ultimoUsoEn: z.string().nullable(),
  expiraEn: z.string().nullable(),
  revocadaEn: z.string().nullable(),
  presupuestoMensualUsd: z.number().nullable(),
  scopeAmplio: z.boolean(),
  valida: z.boolean(),
});
