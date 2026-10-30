import { z } from "zod";

import { feriadosLegales, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { aIso, type DiaVista, diaVistaSchema, instalacionEnAlcance, precedencia, vista } from "./comun";

/**
 * Calendario del año resuelto para el tenant: la unión de los feriados legales nacionales calculados
 * por regla (CAR-79; «Legal (automático)», no editables) con las filas de la tabla —feriados por ley
 * puntual de plataforma, los regionales de la instalación y los días propios del tenant—. Para cada
 * fecha gana la fila de mayor precedencia (tenant por instalación > tenant global > regional >
 * nacional/legal): así un feriado del tenant sobrescribe al legal solo en ese tenant. Sirve para
 * cualquier año (?anio=2031 muestra sus feriados legales aunque no haya ninguna fila en la tabla).
 */
export const calendarioListar = defineCapability({
  id: "core.calendario.listar",
  descripcion:
    "Lista el calendario de feriados y días hábiles del año para la empresa, con los legales calculados por ley, los regionales de la instalación y los días propios del tenant.",
  permiso: PERMISOS_CORE.calendarioRead,
  input: z.object({
    anio: z.number().int().min(2000).max(2100),
    instalacionId: uuidSchema.optional(),
  }),
  output: z.array(diaVistaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // El alcance se aplica en la consulta: la instalación es del tenant y está a cargo del actor
    // (ADR-022) o responde «no encontrada» (sin enumeración). Devuelve su región para los regionales.
    const region = input.instalacionId ? await instalacionEnAlcance(ctx, input.instalacionId) : null;
    const desde = new Date(`${input.anio}-01-01T00:00:00.000Z`);
    const hasta = new Date(`${input.anio + 1}-01-01T00:00:00.000Z`);
    const filas = await ctx.db.diaCalendario.findMany({
      where: {
        archivadaEn: null,
        fecha: { gte: desde, lt: hasta },
        OR: [
          { tenantId: null, fuente: "nacional" },
          ...(region ? [{ tenantId: null, fuente: "regional", region }] : []),
          {
            tenantId: ctx.tenantId,
            ...(input.instalacionId
              ? { OR: [{ instalacionId: null }, { instalacionId: input.instalacionId }] }
              : { instalacionId: null }),
          },
        ],
      },
      orderBy: { fecha: "asc" },
    });
    // Se parte de los feriados legales calculados (precedencia nacional = 0, marcados «automático») y
    // las filas de la tabla los sobrescriben solo si tienen mayor precedencia en la misma fecha.
    const ganador = new Map<string, { orden: number; dia: DiaVista }>();
    for (const f of feriadosLegales(input.anio)) {
      ganador.set(f.fecha, {
        orden: 0,
        dia: {
          id: "", fecha: f.fecha, tipo: "feriado", nombre: f.nombre, irrenunciable: f.irrenunciable,
          fuente: "nacional", region: null, instalacionId: null, editable: false, automatico: true,
        },
      });
    }
    for (const f of filas) {
      const k = aIso(f.fecha);
      const prev = ganador.get(k);
      if (!prev || precedencia(f) > prev.orden)
        ganador.set(k, { orden: precedencia(f), dia: vista(f) });
    }
    return [...ganador.values()]
      .sort((a, b) => (a.dia.fecha < b.dia.fecha ? -1 : a.dia.fecha > b.dia.fecha ? 1 : 0))
      .map((g) => g.dia);
  },
});
