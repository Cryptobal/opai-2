/**
 * Cobro por módulo (ADR-071 y adenda del 4-nov-2026, BRIEF-35): decide si un módulo (o el plan base)
 * de una empresa se factura en un mes y cuánto. Aritmética entera: CLP en pesos, UF en diezmilésimas
 * (`UF_ESCALA`) y el descuento en `PCT_ESCALA`. Orden: precio fijo, o cantidad × precio por unidad;
 * luego el mínimo; luego el prorrateo del primer mes por días; y al final el descuento.
 */
import { PCT_ESCALA, redondearRazonCLP, UF_ESCALA } from "../dinero";
import {
  type CargoCalculado,
  type CondicionCobro,
  diaSiguiente,
  limitesDelPeriodo,
  type MonedaCobro,
  type MotivoCobro,
} from "./catalogo";

const sinCargo = (motivo: MotivoCobro, diasMes: number, extra: Partial<CargoCalculado> = {}) => ({
  facturable: false,
  motivo,
  desde: null,
  diasCobrados: 0,
  diasMes,
  cantidad: null,
  mensual: 0,
  bruto: 0,
  descuento: 0,
  monto: 0,
  ...extra,
});

/**
 * Primer día del cobro: el más tardío entre el inicio explícito y el día siguiente a la prueba. Sin
 * inicio explícito, una prueba vencida solo se cobra si Plataforma marcó «pasa a cobro».
 */
function inicioDelCobro(c: CondicionCobro): { desde: string | null; motivo: MotivoCobro | null } {
  const trasPrueba = c.pruebaHasta ? diaSiguiente(c.pruebaHasta) : null;
  if (trasPrueba && !c.pasaACobro && !c.cobroDesde)
    return { desde: null, motivo: "prueba_vencida" };
  const desde =
    [c.cobroDesde, trasPrueba]
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null;
  return desde ? { desde, motivo: null } : { desde: null, motivo: "sin_inicio" };
}

/**
 * Cargo de un mes. `cantidad` son las unidades contadas (solo cobro `por_unidad`; null si aún no se
 * contaron). Una prueba sin «pasa a cobro» no se cobra nunca: al vencer el módulo queda en solo
 * lectura. Una prueba que vence dentro del mes se cobra desde el día siguiente.
 */
export function cargoDelMes(
  c: CondicionCobro | null,
  estadoModulo: string | null,
  periodo: string,
  cantidad: number | null = null,
): CargoCalculado {
  const { inicio, fin, dias } = limitesDelPeriodo(periodo);
  if (estadoModulo !== "activo" && estadoModulo !== "trial")
    return sinCargo("modulo_inactivo", dias);
  if (!c) return sinCargo("sin_condicion", dias);
  if (c.pruebaHasta && c.pruebaHasta >= fin) return sinCargo("en_prueba", dias);
  const { desde: d, motivo } = inicioDelCobro(c);
  if (!d) return sinCargo(motivo ?? "sin_inicio", dias);
  if (d > fin) return sinCargo("cobro_futuro", dias);
  if (c.forma === "por_unidad" && cantidad === null) return sinCargo("sin_cantidad", dias);
  const desde = d < inicio ? inicio : d;
  const diasCobrados = Number(fin.slice(8)) - Number(desde.slice(8)) + 1;
  const base = c.forma === "por_unidad" ? c.precio * (cantidad ?? 0) : c.precio;
  const mensual = Math.max(base, c.minimoMensual ?? 0);
  const bruto = redondearRazonCLP(BigInt(mensual) * BigInt(diasCobrados), BigInt(dias));
  const descuento = redondearRazonCLP(BigInt(bruto) * BigInt(c.descuentoPct), BigInt(PCT_ESCALA));
  const monto = bruto - descuento;
  const r = {
    desde,
    diasCobrados,
    cantidad: c.forma === "por_unidad" ? cantidad : null,
    mensual,
    bruto,
    descuento,
    monto,
  };
  if (monto <= 0) return sinCargo("bonificado", dias, r);
  return { facturable: true, motivo: "factura", diasMes: dias, ...r };
}

/**
 * Monto en CLP (pesos enteros). En UF usa el valor de la UF en centavos de CLP (como lo publica
 * `core.indicadores.uf_utm`); sin UF devuelve null.
 */
export function aClp(monto: number, moneda: MonedaCobro, ufCentavos: number | null): number | null {
  if (moneda === "CLP") return monto;
  if (ufCentavos === null || ufCentavos <= 0) return null;
  return redondearRazonCLP(BigInt(monto) * BigInt(ufCentavos), BigInt(UF_ESCALA * 100));
}

/** UF escrita por una persona («2,5» o «2.5», hasta 4 decimales) a UF × 10.000. */
export function ufDesdeTexto(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return null;
  const [ent, dec = ""] = t.split(".");
  const n = Number(ent) * UF_ESCALA + Number(dec.padEnd(4, "0"));
  return Number.isSafeInteger(n) ? n : null;
}
