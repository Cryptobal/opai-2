import { z } from "zod";

export const tramoSchema = z.enum(["por_vencer", "1_30", "31_60", "61_mas"]);

export const agingSchema = z.object({
  por_vencer: z.number().int(),
  "1_30": z.number().int(),
  "31_60": z.number().int(),
  "61_mas": z.number().int(),
});

export const deudorSchema = z.object({
  cuentaId: z.string(),
  nombre: z.string(),
  rut: z.string().nullable(),
  facturasVencidas: z.number().int(),
  saldoVencido: z.number().int().describe("CLP enteros."),
  atrasoMaximoDias: z.number().int(),
  tramo: tramoSchema,
  ultimaGestion: z.string().nullable().describe("Fecha ISO de la última gestión de cobranza."),
});

export const facturaVencidaSchema = z.object({
  documentoId: z.string(),
  folio: z.number().int().nullable(),
  vencimiento: z.string().describe("aaaa-mm-dd"),
  atrasoDias: z.number().int(),
  saldo: z.number().int(),
  tramo: tramoSchema,
  pausada: z.boolean(),
  pasosEnviados: z.array(z.number().int()),
});

export const gestionSchema = z.object({
  id: z.string(),
  documentoId: z.string(),
  canal: z.enum(["correo", "whatsapp_manual", "nota"]),
  origen: z.enum(["manual", "automatico"]),
  paso: z.number().int().nullable(),
  resultado: z.enum(["enviado", "fallido", "omitido"]),
  detalle: z.string().nullable(),
  creadoPor: z.string().nullable(),
  fecha: z.string(),
});
