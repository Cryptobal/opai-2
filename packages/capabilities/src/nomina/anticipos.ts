import { z } from "zod";

import { MODOS_ANTICIPO } from "@opai/domain";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_ANTICIPOS, PERMISO_NOVEDADES_READ, ajusteNum, personaDe } from "./comun";
import { nombresDe } from "./novedades-vista";

const reglaSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  personaNombre: z.string(),
  activa: z.boolean(),
  modo: z.enum(MODOS_ANTICIPO),
  valor: z.number().int().describe("Pesos (monto fijo) o puntos base del sueldo base (porcentaje)."),
  diaMes: z.number().int(),
});

type Fila = { id: string; personaId: string; activa: boolean; modo: string; valor: number; diaMes: number };
const vista = (r: Fila, nombre: string) => ({
  id: r.id,
  personaId: r.personaId,
  personaNombre: nombre,
  activa: r.activa,
  modo: r.modo as (typeof MODOS_ANTICIPO)[number],
  valor: r.valor,
  diaMes: r.diaMes,
});

/** Lista las reglas de anticipo quincenal (dato sensible). */
export const anticiposReglasListar = defineCapability({
  id: "nomina.anticipos.reglas_listar",
  descripcion:
    "Lista las reglas de anticipo quincenal por persona: si está activa, el modo (monto fijo o porcentaje del sueldo base), el valor y el día del mes en que se paga. La lectura queda auditada.",
  permiso: PERMISO_NOVEDADES_READ,
  input: z.object({ soloActivas: z.boolean().default(false) }),
  output: z.array(reglaSchema),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.map((r) => r.id),
  async handler(ctx, input) {
    const filas = await ctx.db.nominaReglaAnticipo.findMany({
      where: input.soloActivas ? { activa: true } : {},
      orderBy: { id: "asc" },
    });
    const nombres = await nombresDe(ctx.db, filas.map((f) => f.personaId));
    return filas.map((f) => vista(f, nombres.get(f.personaId) ?? ""));
  },
});

/** Crea o actualiza la regla de anticipo quincenal de una persona (una por persona). */
export const anticiposReglaFijar = defineCapability({
  id: "nomina.anticipos.fijar_regla",
  descripcion:
    "Crea o actualiza la regla de anticipo quincenal de una persona: activa o no, modo (monto fijo en pesos o porcentaje del sueldo base) y día del mes. Hay una sola regla por persona. El día por defecto sale del ajuste de Nómina.",
  permiso: PERMISO_ANTICIPOS,
  input: z.object({
    personaId: uuidSchema,
    activa: z.boolean().default(true),
    modo: z.enum(MODOS_ANTICIPO).default("monto_fijo"),
    valor: z.number().int().positive().max(999_999_999),
    diaMes: z.number().int().min(1).max(31).optional(),
  }),
  output: reglaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const persona = await personaDe(ctx, input.personaId);
    if (input.modo === "porcentaje_base" && input.valor > 10_000)
      throw reglaDeNegocio("Un porcentaje del sueldo base no puede superar 100% (10.000 puntos base).");
    const previa = await ctx.db.nominaReglaAnticipo.findFirst({ where: { personaId: input.personaId } });
    const diaMes = input.diaMes ?? previa?.diaMes ?? (await ajusteNum(ctx, "anticipo_dia_defecto", 15));
    const datos = { activa: input.activa, modo: input.modo, valor: input.valor, diaMes };
    const nombre = `${persona.apellidos}, ${persona.nombres}`;
    if (dryRun) return vista({ id: previa?.id ?? "", personaId: input.personaId, ...datos }, nombre);
    const regla = previa
      ? await ctx.db.nominaReglaAnticipo.update({ where: { id: previa.id }, data: datos })
      : await ctx.db.nominaReglaAnticipo.create({
          data: { tenantId: ctx.tenantId, personaId: input.personaId, ...datos },
        });
    return vista(regla, nombre);
  },
});
