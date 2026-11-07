import { IVA_PCT } from "@opai/domain/dinero";

import type { BasePlantilla } from "./bloques";
import { totalesDocumento } from "./totales";
import type {
  AperturaPropuesta,
  DestinatarioEnvio,
  ServicioDesdeCotizacion,
} from "./propuesta-tecnica-tipos";

export * from "./propuesta-tecnica-tipos";
export {
  parseBloquesArmadorPropuesta,
  parseBloquesPlantillaPropuesta,
} from "./propuesta-tecnica-parse";

const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function normalizarDestinatariosEnvio(
  entrada: readonly DestinatarioEnvio[],
): DestinatarioEnvio[] {
  const vistos = new Set<string>();
  const out: DestinatarioEnvio[] = [];
  for (const d of entrada) {
    const email = d.email.trim().toLowerCase();
    if (!emailOk(email)) continue;
    if (vistos.has(email)) continue;
    vistos.add(email);
    out.push({
      email,
      ...(d.contactoId ? { contactoId: d.contactoId } : {}),
      ...(d.nombre?.trim() ? { nombre: d.nombre.trim() } : {}),
    });
  }
  return out;
}

export function exigirDestinatariosEnvio(entrada: readonly DestinatarioEnvio[]) {
  const norm = normalizarDestinatariosEnvio(entrada);
  if (!norm.length) throw new Error("DESTINATARIOS_VACIOS");
  return norm;
}

export function basePropuestaDesdeCotizacion(
  baseCotizacion: BasePlantilla,
  override?: BasePlantilla | null,
): BasePlantilla {
  return override ?? baseCotizacion;
}

export function aperturaEfectiva(
  plantillaMax: AperturaPropuesta,
  solicitada?: AperturaPropuesta | null,
): AperturaPropuesta {
  const orden: AperturaPropuesta[] = ["por_instalacion", "por_categoria", "por_item"];
  const maxIdx = orden.indexOf(plantillaMax);
  const solIdx = solicitada ? orden.indexOf(solicitada) : maxIdx;
  if (solIdx < 0 || solIdx > maxIdx) return plantillaMax;
  return orden[solIdx] ?? plantillaMax;
}

export type ResumenEconomicoPublico = {
  lineas: { instalacion: string; netoMensualClp: number }[];
  gastosGeneralesYUtilidadClp: number | null;
  netoTotalClp: number;
  ivaClp: number;
  totalClp: number;
};

export function proyectarResumenEconomico(input: {
  apertura: AperturaPropuesta;
  secciones: readonly { nombre: string; netoMensualClp: number }[];
  netoTotalClp: number;
  gastosGeneralesYUtilidadClp?: number | null;
  /** Tasa IVA del tenant en unidades `PCT_ESCALA` (19 % = 190_000). */
  tasaIvaPct?: number;
}): ResumenEconomicoPublico {
  const lineas = input.secciones.map((s) => ({
    instalacion: s.nombre,
    netoMensualClp: s.netoMensualClp,
  }));
  const neto = input.netoTotalClp;
  const gg = input.apertura === "por_item" ? (input.gastosGeneralesYUtilidadClp ?? null) : null;
  const t = totalesDocumento(neto, input.tasaIvaPct ?? IVA_PCT, gg ?? 0);
  return {
    lineas,
    gastosGeneralesYUtilidadClp: gg,
    netoTotalClp: neto,
    ivaClp: t.ivaClp,
    totalClp: t.totalClp,
  };
}

export function huellaServicioCotizacion(servicio: ServicioDesdeCotizacion): string {
  return JSON.stringify(servicio);
}

export function cotizacionServicioCambio(
  guardada: string | null | undefined,
  actual: ServicioDesdeCotizacion,
) {
  if (!guardada) return false;
  return guardada !== huellaServicioCotizacion(actual);
}

export function assertPuedeCongelarPropuesta(estado: string) {
  if (estado === "congelada") throw new Error("PROPUESTA_YA_CONGELADA");
}
