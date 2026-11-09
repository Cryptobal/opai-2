// Vista previa de los próximos períodos de una programación (BRIEF-26 · CAR-159).
import { z } from "zod";

import { fechaFacturaProyectada, periodosProgramacion, sumarDiasIso } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { hoy } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { agendaDe, corteDe, desdeRecuperacion, periodosHechos } from "./ventas-programacion-agenda";
import {
  cargarGenerable,
  resultadoPeriodoSchema as resultadoSchema,
} from "./ventas-programacion-generar";
import { calcularPeriodo, type ResultadoPeriodo } from "./ventas-programacion-calculo";
import { ufCentavosUltima } from "./ventas-programacion-uf";

export const ventasProgramacionVistaPrevia = defineCapability({
  id: "finanzas.ventas_programacion.vista_previa",
  descripcion:
    "Muestra los próximos períodos de una programación recurrente con su fecha, la UF que usaría (estimada con la última publicada si es futura) y el total, o el motivo por el que no se generarían.",
  permiso: PERMISO_READ,
  input: z.object({
    programacionId: uuidSchema,
    cantidad: z.number().int().min(1).max(12).default(6),
  }),
  output: z.object({ periodos: z.array(resultadoSchema) }),
  efecto: "lectura",
  dryRun: false,
  // Solo cifras calculadas de la propia programación, sin datos personales: perfil sin IDs revelados.
  auditarLectura: () => [],
  async handler(ctx, input) {
    const p = await cargarGenerable(ctx, input.programacionId);
    const h = hoy();
    const lista = periodosProgramacion(agendaDe(p), await corteDe(ctx.db, ctx.tenantId, p), {
      desde: desdeRecuperacion(h),
      hasta: sumarDiasIso(h, 800),
      hechos: await periodosHechos(ctx.db, p.id),
      limite: input.cantidad,
    });
    // Períodos futuros sin UF publicada: se estiman con la última UF (la generación real exige la exacta).
    const ufEstimada = await ufCentavosUltima(ctx.db);
    const periodos: ResultadoPeriodo[] = [];
    for (const per of lista) {
      const c = await calcularPeriodo(
        ctx,
        p,
        per.periodo,
        per.fecha,
        per.fecha > h ? ufEstimada : null,
      );
      periodos.push(
        c.ok
          ? {
              ...per,
              estado: "generado",
              motivo: null,
              documentoId: null,
              montoTotal: c.calc.montos.total,
              ufCentavos: c.uf === null ? null : Number(c.uf),
              fechaFactura: fechaFacturaProyectada(per.fecha, {
                diasFacturacion: p.diasFacturacion,
                momento: p.facturaTiming,
                diaFijo: p.facturaDia,
                mesRelativo: p.facturaMesRelativo,
              }).fecha,
            }
          : c.resultado,
      );
    }
    return { periodos };
  },
});
