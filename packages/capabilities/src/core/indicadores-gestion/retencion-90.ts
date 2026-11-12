import { diaEnZona, PERMISOS_CORE, porcentajeDe, sumarDias } from "@opai/domain";

import { defineIndicador, type MedicionIndicador } from "../../indicadores-gestion";

/** Días que una persona tiene que seguir para contar como retenida (ADR-094, CAR-309). */
export const DIAS_RETENCION = 90;

const aDia = (d: Date) => d.toISOString().slice(0, 10);
const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);

/**
 * Indicador de Personas (ADR-094, CAR-309): de las personas que reclutó, qué porcentaje seguía a los 90
 * días. Cuenta en el mes en que se cumplen los 90 días, y solo si ya se cumplieron. Se atribuye a quien
 * figura como «Reclutado por» en el vínculo laboral; los vínculos sin reclutador no cuentan.
 */
export const indicadorRetencion90 = defineIndicador({
  id: "core.personas_retencion_90",
  nombre: "Retención a 90 días",
  descripcion:
    "De las personas que reclutó y que cumplieron 90 días desde su ingreso en el período, qué porcentaje seguía trabajando ese día. Se atribuye a quien figura como «Reclutado por» en el contrato.",
  tipo: "resultado",
  unidad: "porcentaje",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 80,
  origen: "contratos: fecha de ingreso, término y quién reclutó a la persona",
  permiso: PERMISOS_CORE.vinculosRead,
  async medir(ctx, { rango, sujetos, zona, ahora }) {
    const desde = diaEnZona(rango.desde, zona);
    const hasta = diaEnZona(rango.hasta, zona);
    const hoy = diaEnZona(ahora, zona);
    const vinculos = await ctx.db.vinculoLaboral.findMany({
      where: {
        reclutadoPorId: sujetos ? { in: [...sujetos] } : { not: null },
        inicio: {
          gte: aFecha(sumarDias(desde, -DIAS_RETENCION)),
          lt: aFecha(sumarDias(hasta, -DIAS_RETENCION)),
        },
      },
      select: { reclutadoPorId: true, inicio: true, termino: true, estado: true },
    });
    const cuenta = new Map<string, { total: number; siguen: number }>();
    for (const v of vinculos) {
      if (!v.reclutadoPorId) continue;
      const dia90 = sumarDias(aDia(v.inicio), DIAS_RETENCION);
      // Aún no se cumplen los 90 días: no cuenta ni a favor ni en contra.
      if (dia90 > hoy) continue;
      const salio = v.estado === "terminado" && v.termino !== null && aDia(v.termino) < dia90;
      const c = cuenta.get(v.reclutadoPorId) ?? { total: 0, siguen: 0 };
      c.total += 1;
      if (!salio) c.siguen += 1;
      cuenta.set(v.reclutadoPorId, c);
    }
    return [...cuenta].map(
      ([sujetoId, c]): MedicionIndicador => ({ sujetoId, valor: porcentajeDe(c.siguen, c.total) }),
    );
  },
});
