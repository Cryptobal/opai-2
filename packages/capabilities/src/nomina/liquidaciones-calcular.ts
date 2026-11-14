import { z } from "zod";

import { liquidacionDelMes, type Liquidacion, type NovedadesLiquidacion } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { dia } from "../core/maestros/comun";
import { mutualAdicionalTenant } from "../core/remuneraciones";
import type { TenantTx } from "@opai/db";

import type { Contexto } from "../types";
import { bloquearPeriodoAbierto } from "./bloqueos";
import { PERMISO_PERIODOS, periodoDe } from "./comun";
import { cargarBase, juegoDelMes, ocultasDe, personasDelMes } from "./costo-proyectado-datos";
import { exigirPeriodoAbierto } from "./novedades-util";

const vacias = (): NovedadesLiquidacion =>
  ({ diasLicencia: 0, diasAusencia: 0, minutosExtra: 0, anticipos: 0, prestamos: 0, descuentos: 0 });

/** Novedades vigentes del período sumadas por persona, en las unidades del cálculo (se redondea al final). */
async function novedadesPorPersona(db: Contexto["db"] | TenantTx, periodoId: string) {
  const filas = await db.nominaNovedad.findMany({
    where: { periodoId, estado: "vigente" },
    select: { personaId: true, tipo: true, cantidad: true, montoClp: true },
  });
  const porPersona = new Map<string, NovedadesLiquidacion>();
  for (const f of filas) {
    const n = porPersona.get(f.personaId) ?? vacias();
    const cantidad = Number(f.cantidad ?? 0);
    const monto = f.montoClp ?? 0;
    if (f.tipo === "licencia") n.diasLicencia += cantidad;
    else if (f.tipo === "ausencia") n.diasAusencia += cantidad;
    else if (f.tipo === "horas_extra") n.minutosExtra += cantidad * 60;
    else if (f.tipo === "anticipo") n.anticipos += monto;
    else if (f.tipo === "prestamo") n.prestamos += monto;
    else if (f.tipo === "descuento") n.descuentos += monto;
    porPersona.set(f.personaId, n);
  }
  for (const n of porPersona.values()) {
    n.diasLicencia = Math.round(n.diasLicencia);
    n.diasAusencia = Math.round(n.diasAusencia);
    n.minutosExtra = Math.round(n.minutosExtra);
  }
  return porPersona;
}

const omitidaSchema = z.object({ personaId: z.string(), motivo: z.enum(["sin_capa", "oculta", "error_calculo"]) });

/** Calcula (o recalcula) las liquidaciones del período con el motor de sueldos (Brief 27). */
export const liquidacionesCalcular = defineCapability({
  id: "nomina.liquidaciones.calcular",
  descripcion:
    "Calcula o recalcula las liquidaciones de un período abierto o en revisión: sueldo de la capa proporcional a los días trabajados, horas extra, cotizaciones, impuesto único, anticipos, cuotas de préstamo y descuentos. Es idempotente; omite con motivo a quien no tiene capa de sueldo completa.",
  permiso: PERMISO_PERIODOS,
  input: z.object({ periodoId: uuidSchema }),
  output: z.object({
    calculadas: z.number().int(),
    omitidas: z.array(omitidaSchema),
    totalLiquido: z.number().int(),
    advertencias: z.array(z.string()),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { periodoId }, { dryRun }) {
    // Recalcular reemplaza las liquidaciones del período: exige ver a todo el personal y sus sueldos.
    if (ctx.alcance) throw prohibido("Calcular el período exige ver a todo el personal; tu rol tiene alcance por instalación.");
    const periodo = await periodoDe(ctx, periodoId);
    exigirPeriodoAbierto(periodo);
    const m = { anio: periodo.anio, mes: periodo.mes };
    const [ini, fin] = [dia(periodo.inicio) ?? "", dia(periodo.fin) ?? ""];
    const juego = await juegoDelMes(ctx, fin);
    if (typeof juego === "string") throw reglaDeNegocio(`Faltan valores legales para el mes (${juego}).`);
    const base = await cargarBase(ctx, ini, fin);
    const ocultas = base.estructuras.length ? await ocultasDe(ctx, base.estructuras) : new Map<string, boolean>();
    if ([...ocultas.values()].some(Boolean))
      throw prohibido("Calcular el período exige ver los sueldos de todo el personal (permiso de montos sensibles).");
    const grupo = personasDelMes(base, m, ocultas);
    const mutual = await mutualAdicionalTenant(ctx);
    const calcular = async (db: Contexto["db"] | TenantTx) => {
      const novedades = await novedadesPorPersona(db, periodoId);
      const omitidas: z.infer<typeof omitidaSchema>[] = [...grupo.omitidas];
      const filas = grupo.personas.flatMap((p) => {
        try {
          const l = liquidacionDelMes({ ...p, mutualAdicional: mutual ?? 0, novedades: novedades.get(p.personaId) ?? vacias() }, juego);
          return [{ personaId: p.personaId, l }];
        } catch {
          omitidas.push({ personaId: p.personaId, motivo: "error_calculo" });
          return [];
        }
      });
      const salida = {
        calculadas: filas.length,
        omitidas,
        totalLiquido: filas.reduce((s, f) => s + f.l.liquido, 0),
        advertencias: mutual == null ? ["Mutual adicional sin confirmar: se usa 0 %."] : [],
      };
      return { filas, salida };
    };
    if (dryRun) return (await calcular(ctx.db)).salida;
    return ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, periodoId);
      // Con el período bloqueado, las novedades ya no cambian: se calcula con ellas.
      const { filas, salida } = await calcular(tx);
      // Se conservan las de quien falló el cálculo; se borran las de quien ya no tiene vínculo o capa.
      const conservar = [...filas.map((f) => f.personaId), ...salida.omitidas.filter((o) => o.motivo === "error_calculo").map((o) => o.personaId)];
      await tx.nominaLiquidacion.deleteMany({ where: { periodoId, personaId: { notIn: conservar } } });
      await guardarLiquidaciones(tx, ctx.tenantId, periodoId, filas);
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.liquidaciones.calculadas",
        entidadTipo: "periodo",
        entidadId: periodoId,
        payload: { periodoId, cantidad: filas.length },
      });
      return salida;
    });
  },
});

/** Guarda (crea o actualiza) la liquidación de cada persona dentro de la transacción del cálculo. */
async function guardarLiquidaciones(tx: TenantTx, tenantId: string, periodoId: string, filas: { personaId: string; l: Liquidacion }[]) {
  for (const { personaId, l } of filas) {
    const datos = {
      estado: "calculada", diasTrabajados: l.diasTrabajados, haberes: l.totalHaberes, imponible: l.imponible,
      descuentosLegales: l.totalDescuentosLegales, otrosDescuentos: l.totalOtrosDescuentos, liquido: l.liquido,
      costoEmpresa: l.costoEmpresa, capaId: l.capaId, juegoHuella: l.huellaJuego, calculadaEn: new Date(),
      detalle: { haberes: l.haberes, descuentosLegales: l.descuentosLegales, otrosDescuentos: l.otrosDescuentos,
        aportesEmpleador: l.aportesEmpleador, diasLicencia: l.diasLicencia, prevision: l.prevision },
      advertencias: l.advertencias,
    };
    const previa = await tx.nominaLiquidacion.findFirst({ where: { periodoId, personaId }, select: { id: true } });
    if (previa) await tx.nominaLiquidacion.update({ where: { id: previa.id }, data: datos });
    else await tx.nominaLiquidacion.create({ data: { tenantId, periodoId, personaId, ...datos } });
  }
}
