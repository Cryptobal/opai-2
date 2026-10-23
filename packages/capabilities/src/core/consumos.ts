import { z } from "zod";

import { microAUsd, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { consumosDelMes, sumarPor, type GrupoConsumo } from "./consumos-fuente";

export { rangoMes } from "./consumos-fuente";

const mesSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato aaaa-mm.")
  .optional()
  .describe("Mes en formato aaaa-mm. Por defecto, el mes en curso.");

const filaSchema = z.object({
  clave: z.string(),
  cantidad: z.number(),
  costoMicro: z.number(),
  costoUsd: z.number(),
});

const conUsd = (filas: ReturnType<typeof sumarPor>) =>
  filas.map((f) => ({ ...f, costoUsd: microAUsd(f.costoMicro) }));

const totalUsd = (grupos: GrupoConsumo[]) =>
  microAUsd(grupos.reduce((t, g) => t + g.costoMicro, 0));

export const consumosResumen = defineCapability({
  id: "core.consumos.resumen",
  descripcion:
    "Consumos de la empresa en un mes (ADR-031): total en USD y, por recurso (IA, correo, mapas, almacenamiento, ejecuciones), cantidad y costo.",
  permiso: PERMISOS_CORE.consumosRead,
  input: z.object({ mes: mesSchema }),
  output: z.object({ mes: z.string(), totalUsd: z.number(), porRecurso: z.array(filaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const { desde, grupos } = await consumosDelMes(ctx, input.mes);
    return {
      mes: desde.toISOString().slice(0, 7),
      totalUsd: totalUsd(grupos),
      porRecurso: conUsd(sumarPor(grupos, (g) => g.recurso)),
    };
  },
});

export const consumosPorRecurso = defineCapability({
  id: "core.consumos.por_recurso",
  descripcion:
    "Detalle del consumo de un recurso en un mes (por ejemplo IA estándar o correo): cantidad y costo por módulo y por agente que lo usó.",
  permiso: PERMISOS_CORE.consumosRead,
  input: z.object({
    mes: mesSchema,
    recurso: z.string().min(1).max(80).describe('Recurso medido, p. ej. "correo.enviado".'),
  }),
  output: z.object({
    mes: z.string(),
    recurso: z.string(),
    totalUsd: z.number(),
    cantidad: z.number(),
    porModulo: z.array(filaSchema),
    porAgente: z.array(filaSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const { desde, grupos } = await consumosDelMes(ctx, input.mes, { recurso: input.recurso });
    return {
      mes: desde.toISOString().slice(0, 7),
      recurso: input.recurso,
      totalUsd: totalUsd(grupos),
      cantidad: grupos.reduce((t, g) => t + g.cantidad, 0),
      porModulo: conUsd(sumarPor(grupos, (g) => g.modulo)),
      porAgente: conUsd(sumarPor(grupos, (g) => g.apiKeyId ?? "personas")),
    };
  },
});

export const consumosPorAgente = defineCapability({
  id: "core.consumos.por_agente",
  descripcion:
    "Consumos del mes por agente (API key): ejecuciones y costo en USD de cada key, para controlar presupuestos (ADR-032).",
  permiso: PERMISOS_CORE.consumosRead,
  input: z.object({ mes: mesSchema }),
  output: z.array(
    z.object({
      apiKeyId: z.string(),
      nombre: z.string(),
      ejecuciones: z.number(),
      costoUsd: z.number(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const [{ grupos }, keys] = await Promise.all([
      consumosDelMes(ctx, input.mes),
      ctx.db.apiKey.findMany({ select: { id: true, nombre: true } }),
    ]);
    const nombres = new Map(keys.map((k) => [k.id, k.nombre]));
    const conKey = grupos.filter((g) => g.apiKeyId !== null);
    const costos = sumarPor(conKey, (g) => g.apiKeyId ?? "");
    const ejecuciones = sumarPor(
      conKey.filter((g) => g.recurso === "capacidad.ejecucion"),
      (g) => g.apiKeyId ?? "",
    );
    return costos.map((c) => ({
      apiKeyId: c.clave,
      nombre: nombres.get(c.clave) ?? "Key eliminada",
      ejecuciones: ejecuciones.find((e) => e.clave === c.clave)?.cantidad ?? 0,
      costoUsd: microAUsd(c.costoMicro),
    }));
  },
});
