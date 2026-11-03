import { z } from "zod";

const accionSchema = z.enum(["crear", "actualizar", "sin_cambios", "conflicto", "omitido"]);

export const reporteImportar10Schema = z.object({
  modo: z.literal("simulacion"),
  sistema: z.literal("opai1"),
  tenant: z.string(),
  modulosActivos: z.array(z.string()),
  conteos: z.object({
    cuenta: z.record(accionSchema, z.number().int()),
    contacto: z.record(accionSchema, z.number().int()),
    instalacion: z.record(accionSchema, z.number().int()),
    programacion_recurrente: z.record(accionSchema, z.number().int()),
    etapa: z.record(accionSchema, z.number().int()),
    negocio: z.record(accionSchema, z.number().int()),
    negocio_etapa: z.record(accionSchema, z.number().int()),
    negocio_contacto: z.record(accionSchema, z.number().int()),
    cotizacion: z.record(accionSchema, z.number().int()),
  }),
  tributario: z.object({
    cuentasConsideradas: z.number().int(),
    listasParaFacturar: z.number().int(),
    incompletas: z.number().int(),
    faltantesPorCampo: z.record(z.string(), z.number().int()),
  }),
  destinatarios: z.object({
    entrantes: z.number().int(),
    asignados: z.number().int(),
    omitidos: z.number().int(),
    omitidosPorMotivo: z.record(z.string(), z.number().int()),
  }),
  correlativosCpq: z.array(
    z.object({
      anio: z.number().int(),
      ultimoEnExport: z.number().int(),
      cotizacionesConsideradas: z.number().int(),
      fijariaUltimo: z.number().int(),
      omitido: z.boolean(),
      motivo: z.string().nullable(),
    }),
  ),
  pendientes: z.array(
    z.object({ entidad: z.string(), filas: z.number().int(), motivo: z.string() }),
  ),
  avisos: z.array(z.object({ codigo: z.string(), idsOpai1: z.array(z.string()) })),
});

export const resultadoImportar10Schema = z.object({
  dryRun: z.boolean(),
  reporte: reporteImportar10Schema,
  aplicadas: z
    .object({
      cuentas: z.number().int(),
      contactos: z.number().int(),
      instalaciones: z.number().int(),
      programaciones: z.number().int(),
      correlativosCpq: z.number().int(),
      omitidas: z.number().int(),
    })
    .nullable(),
  usuariosResueltos: z.number().int(),
  usuariosSinMembresia: z.array(z.string()),
});
