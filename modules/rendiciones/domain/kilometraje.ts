// Kilometraje configurable por empresa (CAR-194, R2a; alcance-rendiciones §4.4, ADR-021).
// La fórmula es configuración versionada evaluada aquí, nunca código por empresa. Dominio puro:
// CLP en enteros, porcentajes en unidades de PCT_ESCALA y la distancia en décimas de km.
import { clp, porcentajeCLP, redondearRazonCLP } from "@opai/domain";

export const METODOS_KM = ["consumo", "tarifa_km", "tramo_fijo"] as const;
export type MetodoKm = (typeof METODOS_KM)[number];

/** Versión del esquema de la configuración que se guarda en la instantánea del viaje. */
export const VERSION_CONFIG_KM = 1;
export const MAX_MONTO_KM = 50_000_000;

export type TramoFijo = { nombre: string; montoClp: number };

/** Parámetros de la empresa. `metodo` vacío o desconocido = sin configurar. */
export type ConfigKilometraje = {
  version: number;
  metodo: string;
  /** km por litro, hasta 1 decimal. */
  rendimientoKmL: number;
  precioLitroClp: number;
  /** Recargo por desgaste, en unidades de PCT_ESCALA (10 % = 100.000). */
  recargoPct: number;
  tarifaKmClp: number;
  tramos: readonly TramoFijo[];
};

export type EntradaViaje = { km: number; idaYVuelta: boolean; peajeClp: number; tramo?: string | undefined };
export type LineaKm = { concepto: string; montoClp: number; detalle: string };
export type MotivoKm = "sin_configurar" | "metodo_desconocido" | "config_incompleta" | "km_invalido" | "peaje_invalido" | "tramo_invalido";

export type ResultadoKm =
  | { ok: true; kmEfectivos: number; montoClp: number; lineas: LineaKm[] }
  | { ok: false; motivo: MotivoKm; mensaje: string };

const falla = (motivo: MotivoKm, mensaje: string): ResultadoKm => ({ ok: false, motivo, mensaje });
const entero = (n: number) => Number.isSafeInteger(n);
const decimas = (n: number) => Math.round(n * 10);
const fmtKm = (d: number) => (d / 10).toLocaleString("es-CL", { maximumFractionDigits: 1 });

/** Convierte los ajustes planos del módulo (porcentaje entero 0–100) en la configuración versionada. */
export function configDesdeAjustes(a: {
  metodo: string; rendimientoKmL: number; precioLitroClp: number; recargoPorcentaje: number; tarifaKmClp: number;
  tramos: readonly TramoFijo[];
}): ConfigKilometraje {
  return {
    version: VERSION_CONFIG_KM, metodo: a.metodo, rendimientoKmL: a.rendimientoKmL, precioLitroClp: a.precioLitroClp,
    recargoPct: Math.round(a.recargoPorcentaje * 10_000), tarifaKmClp: a.tarifaKmClp, tramos: a.tramos,
  };
}

/** Misma fórmula para la vista previa y para lo que se guarda (R-REN-12). Nunca devuelve 0 silencioso. */
export function calcularKilometraje(config: ConfigKilometraje, viaje: EntradaViaje): ResultadoKm {
  if (!config.metodo) return falla("sin_configurar", "Tu empresa aún no configura el kilometraje");
  if (!(METODOS_KM as readonly string[]).includes(config.metodo)) return falla("metodo_desconocido", `Método de kilometraje desconocido: «${config.metodo}».`);
  if (!Number.isFinite(viaje.km) || viaje.km < 0) return falla("km_invalido", "Los kilómetros del viaje no son válidos.");
  if (!entero(viaje.peajeClp) || viaje.peajeClp < 0) return falla("peaje_invalido", "El peaje debe ser un monto entero de pesos, 0 o más.");
  const kmd = decimas(viaje.km) * (viaje.idaYVuelta ? 2 : 1);
  const lineas: LineaKm[] = [];
  const km = `${fmtKm(kmd)} km${viaje.idaYVuelta ? " (ida y vuelta)" : ""}`;
  if (config.metodo === "tramo_fijo") {
    const tramo = config.tramos.find((t) => t.nombre === viaje.tramo);
    if (config.tramos.length === 0) return falla("config_incompleta", "El kilometraje por tramos no tiene tramos configurados.");
    if (!tramo) return falla("tramo_invalido", "Elige uno de los tramos configurados por tu empresa.");
    if (!entero(tramo.montoClp) || tramo.montoClp <= 0) return falla("config_incompleta", `El tramo «${tramo.nombre}» no tiene un monto válido.`);
    lineas.push({ concepto: "Tramo fijo", montoClp: tramo.montoClp, detalle: tramo.nombre });
  } else {
    if (kmd <= 0) return falla("km_invalido", "El viaje debe tener más de 0 km.");
    if (config.metodo === "tarifa_km") {
      if (!entero(config.tarifaKmClp) || config.tarifaKmClp <= 0) return falla("config_incompleta", "Falta la tarifa por km.");
      lineas.push({ concepto: "Tarifa por km", montoClp: redondearRazonCLP(BigInt(kmd) * BigInt(config.tarifaKmClp), 10n), detalle: `${km} × $${config.tarifaKmClp.toLocaleString("es-CL")}` });
    } else {
      const rend = decimas(config.rendimientoKmL);
      if (rend <= 0 || !entero(config.precioLitroClp) || config.precioLitroClp <= 0 || !entero(config.recargoPct) || config.recargoPct < 0)
        return falla("config_incompleta", "Faltan el rendimiento, el precio del litro o el recargo.");
      // litros = km / rendimiento; combustible = round(litros × precio): razón exacta, sin float.
      const combustible = redondearRazonCLP(BigInt(kmd) * BigInt(config.precioLitroClp), BigInt(rend));
      lineas.push({ concepto: "Combustible", montoClp: combustible, detalle: `${km} ÷ ${config.rendimientoKmL} km/l × $${config.precioLitroClp.toLocaleString("es-CL")}/l` });
      lineas.push({ concepto: "Desgaste del vehículo", montoClp: porcentajeCLP(clp(combustible), config.recargoPct), detalle: `${config.recargoPct / 10_000} % del combustible` });
    }
  }
  if (viaje.peajeClp > 0) lineas.push({ concepto: "Peaje", montoClp: viaje.peajeClp, detalle: "Monto del viaje completo" });
  const montoClp = lineas.reduce((s, l) => s + l.montoClp, 0);
  if (montoClp > MAX_MONTO_KM) return falla("km_invalido", "El monto calculado supera el máximo permitido.");
  return { ok: true, kmEfectivos: kmd / 10, montoClp, lineas };
}
