import { redondearCLP } from "../dinero";
import type { Estructura } from "../estructuras";
import type { costoEmpleadorPorPersona } from "../remuneraciones/costo-empresa";
import { DIAS_MES_LIQUIDACION, type LineaLiquidacion, type NovedadesLiquidacion } from "./liquidacion";

// Partes de la liquidación mensual (CAR-99): capa proporcional a los días y líneas del motor.

const proporcional = (monto: number | null | undefined, dias: number) =>
  monto == null ? monto ?? null : redondearCLP((monto * dias) / DIAS_MES_LIQUIDACION);

const conMonto = (l: LineaLiquidacion[]) => l.filter((x) => x.monto !== 0);

/** Capa del mes: montos proporcionales a los días trabajados y las horas extra como bono imponible. */
export function capaDelMes(capa: Estructura, dias: number, horasExtra: number): Estructura {
  return {
    ...capa,
    sueldoBase: proporcional(capa.sueldoBase, dias),
    colacion: proporcional(capa.colacion, dias),
    movilizacion: proporcional(capa.movilizacion, dias),
    gratificacionMonto: proporcional(capa.gratificacionMonto, dias),
    items: [
      ...capa.items.map((i) => (i.tipo === "bono_fijo" ? { ...i, monto: proporcional(i.monto, dias) } : i)),
      ...(horasExtra > 0
        ? [{ tipo: "bono_fijo" as const, nombre: "Horas extra", monto: horasExtra, porcentaje: null, imponible: true }]
        : []),
    ],
  };
}

type Desglose = ReturnType<typeof costoEmpleadorPorPersona>["desglose"];

/** Líneas de la liquidación a partir del desglose del motor y las novedades. */
export function lineasDe(d: Desglose, n: NovedadesLiquidacion, horasExtra: number) {
  const h = d.haberes;
  return {
    haberes: conMonto([
      { concepto: "Sueldo base", monto: h.sueldoBase },
      { concepto: "Gratificación", monto: h.gratificacion },
      { concepto: "Horas extra", monto: horasExtra },
      { concepto: "Bonos imponibles", monto: h.bonosImponibles - horasExtra },
      { concepto: "Colación", monto: h.colacion },
      { concepto: "Movilización", monto: h.movilizacion },
      { concepto: "Bonos no imponibles", monto: h.bonosNoImponibles },
    ]),
    descuentosLegales: conMonto([
      { concepto: "AFP", monto: d.afpClp },
      { concepto: "Salud", monto: d.saludClp },
      { concepto: "Seguro de cesantía", monto: d.cesantiaTrabajadorClp },
      { concepto: "Impuesto único", monto: d.impuestoUnicoClp },
    ]),
    otrosDescuentos: conMonto([
      { concepto: "Anticipos", monto: n.anticipos },
      { concepto: "Cuotas de préstamo", monto: n.prestamos },
      { concepto: "Descuentos", monto: n.descuentos },
    ]),
    aportesEmpleador: conMonto([
      { concepto: "Seguro de cesantía empleador", monto: d.cesantiaEmpleadorClp },
      { concepto: "Ley 16.744 y SANNA", monto: d.mutualClp },
      { concepto: "SIS", monto: d.sisClp },
      { concepto: "Aporte de la reforma", monto: d.reformaClp },
    ]),
  };
}

