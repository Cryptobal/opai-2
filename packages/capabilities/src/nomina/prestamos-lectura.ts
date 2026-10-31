import { z } from "zod";

import { ESTADOS_PRESTAMO } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_PRESTAMOS_READ } from "./comun";
import { nombresDe } from "./novedades-vista";
import { prestamoSchema, vistaPrestamo } from "./prestamos-vista";

/** Lista los préstamos con su plan de cuotas (dato sensible). */
export const prestamosListar = defineCapability({
  id: "nomina.prestamos.listar",
  descripcion:
    "Lista los préstamos a trabajadores con su monto, número de cuotas, estado, saldo pendiente y el plan de cuotas mensual. Se puede filtrar por persona o por estado. La lectura queda auditada.",
  permiso: PERMISO_PRESTAMOS_READ,
  input: z.object({
    personaId: uuidSchema.optional(),
    estado: z.enum(ESTADOS_PRESTAMO).optional(),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.array(prestamoSchema),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.map((p) => p.id),
  async handler(ctx, input) {
    const filas = await ctx.db.nominaPrestamo.findMany({
      where: {
        ...(input.personaId ? { personaId: input.personaId } : {}),
        ...(input.estado ? { estado: input.estado } : {}),
      },
      orderBy: { id: "desc" },
      take: input.limite,
    });
    const cuotas = await ctx.db.nominaCuota.findMany({
      where: { prestamoId: { in: filas.map((f) => f.id) } },
    });
    const nombres = await nombresDe(ctx.db, filas.map((f) => f.personaId));
    return filas.map((f) =>
      vistaPrestamo(f, cuotas.filter((c) => c.prestamoId === f.id), nombres.get(f.personaId) ?? ""),
    );
  },
});
