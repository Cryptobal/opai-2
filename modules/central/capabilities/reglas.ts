import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { aplicarRegla, SENALES, senalDe } from "../domain/senales";
import { severidadSchema } from "./esquemas";

const PERMISO_CONFIG = "central:config.manage";

const reglaSchema = z.object({
  evento: z.string().describe("Señal que publica un módulo, p. ej. rondas.emergencia."),
  nombre: z.string(),
  severidad: severidadSchema,
  activa: z.boolean(),
  fija: z.boolean().describe("La emergencia es siempre crítica y no se puede apagar (R5, R11)."),
  porDefecto: z.boolean().describe("true = la empresa no la ha cambiado."),
});

/** Cursor por evento (el catálogo es fijo y corto); no reusa listaSchema de alertas (uuid). */
const inputListar = z.object({
  cursor: z.string().optional().describe("Evento de la última regla de la página anterior."),
  limite: z.number().int().min(1).max(100).default(50),
});

export const reglasListar = defineCapability({
  auditarLectura: () => [], // Catálogo de configuración: no revela personas ni entidades.
  id: "central.reglas.listar",
  descripcion:
    "Lista las reglas de vigilancia de la central: cada señal de Asistencia y Rondas, si abre alertas y con qué severidad, con lo que la empresa cambió sobre el catálogo.",
  permiso: "central:alertas.ver",
  input: inputListar,
  output: z.object({ items: z.array(reglaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.centralRegla.findMany();
    const propias = Object.fromEntries(filas.map((r) => [r.evento, r]));
    const todas = SENALES.map((s) => {
      const r = propias[s.evento];
      const e = aplicarRegla(s, r);
      return {
        evento: s.evento,
        nombre: s.nombre,
        severidad: e.severidad,
        activa: e.activa,
        fija: !!s.fija,
        porDefecto: !r,
      };
    });
    const desde = input.cursor ? todas.findIndex((r) => r.evento === input.cursor) + 1 : 0;
    if (input.cursor && desde === 0) return { items: [], siguiente: null };
    const items = todas.slice(desde, desde + input.limite);
    const hayMas = desde + input.limite < todas.length;
    return { items, siguiente: hayMas ? (items.at(-1)?.evento ?? null) : null };
  },
});

export const reglasGuardar = defineCapability({
  id: "central.reglas.guardar",
  descripcion:
    "Cambia una regla de vigilancia de la central: si la señal abre alertas y con qué severidad. La emergencia no se puede apagar ni bajar de crítica.",
  permiso: PERMISO_CONFIG,
  // R10: cambiar reglas es de aprobación humana para cualquier agente.
  exigeAprobacion: () => true,
  input: z.object({ evento: z.string(), severidad: severidadSchema, activa: z.boolean() }),
  output: z.object({ evento: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const s = senalDe(i.evento);
    if (!s) throw reglaDeNegocio("Esa señal no existe en el catálogo de la central.");
    if (s.fija && (!i.activa || i.severidad !== s.severidad))
      throw reglaDeNegocio(`«${s.nombre}» es siempre crítica y no se puede apagar.`);
    if (dryRun) return { evento: i.evento };
    await ctx.transaccion((tx) =>
      tx.centralRegla.upsert({
        where: { tenantId_evento: { tenantId: ctx.tenantId, evento: i.evento } },
        create: { tenantId: ctx.tenantId, evento: i.evento, severidad: i.severidad, activa: i.activa },
        update: { severidad: i.severidad, activa: i.activa },
      }),
    );
    return { evento: i.evento };
  },
});
