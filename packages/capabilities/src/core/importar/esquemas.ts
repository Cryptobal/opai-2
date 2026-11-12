import { z } from "zod";

import { uuidSchema } from "../esquemas";
import { entradaSchema } from "./entrada";
import { IDS_IMPORTADORES } from "./registro";
import { AL_EXISTIR } from "./tipos";

export const importadorId = z.enum(IDS_IMPORTADORES).describe("Qué se importa: cuentas, contactos, instalaciones, negocios, personas, contratos o documentos_venta (facturas y notas emitidas).");
const accion = z.enum(["crear", "actualizar", "sin_cambio", "error"]);
export const conteosSchema = z.object({ crear: z.number().int(), actualizar: z.number().int(), sin_cambio: z.number().int(), error: z.number().int() });

export const inputEjecutar = z.object({
  importador: importadorId,
  ...entradaSchema,
  mapeo: z
    .record(z.string().max(200), z.string().max(60).nullable())
    .optional()
    .describe("Encabezado de la planilla → clave del campo (null para ignorar la columna). Lo que no se indique se mapea solo por nombre."),
  alExistir: z
    .enum(AL_EXISTIR)
    .default("completar")
    .describe("Qué hacer con un registro que ya existe: «completar» solo llena lo que está vacío, «sobrescribir» reemplaza lo distinto, «omitir» no lo toca."),
  desde: z.number().int().min(0).max(20_000).default(0).describe("Fila de datos desde la que se procesa (0 = la primera). Se procesan hasta 500 por llamada; usa el `siguiente` de la respuesta."),
  importacionId: uuidSchema.optional().describe("Lote al que se suman estas filas (el de una llamada anterior de la misma planilla), para revertirlas juntas."),
  soloSiTodoValido: z.boolean().default(false).describe("Si es verdadero, no importa nada cuando alguna fila tiene errores."),
});

export const outputEjecutar = z.object({
  simulacion: z.boolean(),
  importador: z.string(),
  origen: z.string(),
  columnas: z.array(z.string()),
  mapeo: z.record(z.string(), z.string().nullable()),
  columnasIgnoradas: z.array(z.string()),
  bloqueos: z.array(z.string()).describe("Problemas que impiden importar cualquier fila (mapeo inválido o falta una columna obligatoria)."),
  totalFilas: z.number().int(),
  desde: z.number().int(),
  siguiente: z.number().int().nullable().describe("Valor de `desde` para la próxima llamada, o null si no quedan filas."),
  conteos: conteosSchema,
  filas: z.array(z.object({ fila: z.number().int(), accion, etiqueta: z.string(), mensajes: z.array(z.string()), cambios: z.array(z.string()) })),
  importacionId: z.string().nullable().describe("Lote creado o ampliado; sirve para revertir. Null en la simulación o si no hubo nada que escribir."),
});

const campoSchema = z.object({
  clave: z.string(), etiqueta: z.string(), tipo: z.string(), requerido: z.boolean(), ayuda: z.string().nullable(),
  ejemplo: z.string(), opciones: z.array(z.string()), sinonimos: z.array(z.string()),
});

export const outputCatalogo = z.object({
  importadores: z.array(
    z.object({
      id: z.string(), etiqueta: z.string(), descripcion: z.string(),
      disponible: z.boolean().describe("Falso si falta el permiso sobre esa entidad o su módulo no está activo."),
      campos: z.array(campoSchema),
    }),
  ),
  limites: z.object({ filasPorLlamada: z.number().int(), filasPorArchivo: z.number().int(), megabytes: z.number() }),
});

export const loteSchema = z.object({
  id: z.string(), importador: z.string(), archivo: z.string().nullable(), origen: z.string(), sistema: z.string(),
  estado: z.enum(["en_curso", "completada", "fallida", "revertida"]), conteos: conteosSchema,
  lanzadaPor: z.string().nullable(), iniciadaEn: z.string(), terminadaEn: z.string().nullable(), revertidaEn: z.string().nullable(),
});
