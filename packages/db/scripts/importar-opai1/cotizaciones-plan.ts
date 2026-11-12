// Plan de cotizaciones de OPAI 1 (CpqQuote → cpq.cotizaciones, CAR-326). Es carga histórica: la
// cotización entra con su código, su estado, su vigencia, su venta mensual y los puestos cotizados.
// No se recalcula nada: el costo y el precio de 1.0 son lo que fue; el motor de 2.0 solo corre si
// alguien edita una versión nueva. Lo que 2.0 no modela (comidas, vehículos, etc.) se cuenta y avisa.
import { type Aviso, type Decision, decision, indiceIds, ordenEstable } from "./comun";
import type { EstadoDestino } from "./destino-tipos";
import type { CotizacionOpai1 } from "./origen";
import type { PuestoCotizacionOpai1 } from "./origen-cotizaciones";
import { textoLimpio } from "./normalizar";
import type { DatosCotizacion, DatosLineaCotizacion } from "./cotizaciones-tipos";

export type { DatosCotizacion, DatosLineaCotizacion } from "./cotizaciones-tipos";

export const MOTIVO_SIN_NEGOCIO = "sin_negocio";
export const MOTIVO_NEGOCIO_NO_IMPORTADO = "negocio_no_importado";

const ESTADOS_GANADA = ["approved", "accepted", "won", "active", "in_progress"];
const ESTADOS_ENVIADA = ["sent", "viewed"];
const DIAS: Record<string, number> = {
  lun: 1, lunes: 1, mar: 2, martes: 2, mie: 3, mié: 3, miercoles: 3, miércoles: 3,
  jue: 4, jueves: 4, vie: 5, viernes: 5, sab: 6, sáb: 6, sabado: 6, sábado: 6, dom: 7, domingo: 7,
};

export function estadoDeVersion(status: string | null | undefined): "borrador" | "enviada" | "aceptada" | "rechazada" {
  const s = (status ?? "").trim().toLowerCase();
  if (ESTADOS_GANADA.includes(s)) return "aceptada";
  if (ESTADOS_ENVIADA.includes(s)) return "enviada";
  if (s === "rejected") return "rechazada";
  return "borrador";
}

const MODO_MARGEN: Record<string, DatosCotizacion["margenModo"]> = {
  margin_on_sale: "margen_sobre_venta",
  markup: "markup",
  margin_on_labor: "margen_sobre_mano_de_obra",
};

/** Días de la semana de 1.0 (texto corto o largo; `Fer` y lo desconocido no cuentan) a 1–7. */
export function diasDePuesto(weekdays: readonly (string | number)[]): number[] {
  const out = new Set<number>();
  for (const w of weekdays) {
    const d = DIAS[String(w).trim().toLowerCase()];
    if (d) out.add(d);
  }
  return [...out].sort((a, b) => a - b);
}

const entero = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v));

function lineaDePuesto(p: PuestoCotizacionOpai1, orden: number): DatosLineaCotizacion {
  const dias = diasDePuesto(p.weekdays);
  const salud = (p.healthSystem ?? "").trim().toLowerCase();
  const posiciones = Math.max(1, entero(p.numPuestos) ?? 1);
  return {
    nombre:
      textoLimpio(p.customName) ?? textoLimpio(p.puestoTrabajo?.name) ?? textoLimpio(p.cargo?.name) ?? "Puesto",
    grupo: textoLimpio(p.puestoTrabajo?.name),
    posiciones,
    orden,
    horaInicio: textoLimpio(p.startTime),
    horaFin: textoLimpio(p.endTime),
    diasSemana: dias,
    sueldoBaseClp: p.baseSalary && p.baseSalary > 0 ? entero(p.baseSalary) : null,
    afp: textoLimpio(p.afpName),
    saludTipo: salud === "fonasa" || salud === "isapre" ? salud : null,
  };
}

function cuentaNoModelada(q: CotizacionOpai1): number {
  return (
    q.uniformItems.length + q.examItems.length + q.costItems.length + q.meals.length +
    q.vehicles.length + q.infrastructure.length + q.additionalLines.length
  );
}

type Resolver = (idOpai1: string | null | undefined) => string | null;

/**
 * Una cotización entra si su negocio entra (el modelo de 2.0 exige negocio). `resolverNegocio`
 * devuelve la clave del negocio (id de 1.0) cuando se crea o ya existe en 2.0.
 */
export function planCotizacionesCpq(
  filas: readonly CotizacionOpai1[],
  destino: EstadoDestino,
  resolverNegocio: Resolver,
  resolverInstalacion: Resolver,
): { decisiones: Decision<DatosCotizacion>[]; avisos: Aviso[] } {
  const ids = indiceIds(destino, "cotizacion");
  const decisiones: Decision<DatosCotizacion>[] = [];
  const avisos: Aviso[] = [];
  const porNegocio = new Map<string, { id: string; puntaje: number; creada: number }[]>();

  for (const q of ordenEstable(filas)) {
    const yaImportada = ids.porExterno.get(q.id);
    if (yaImportada) {
      decisiones.push(decision("cotizacion", q.id, "sin_cambios", { destinoId: yaImportada }));
      continue;
    }
    if (!q.dealId) {
      decisiones.push(decision("cotizacion", q.id, "omitido", { motivo: MOTIVO_SIN_NEGOCIO }));
      continue;
    }
    const negocio = resolverNegocio(q.dealId);
    if (!negocio) {
      decisiones.push(decision("cotizacion", q.id, "omitido", { motivo: MOTIVO_NEGOCIO_NO_IMPORTADO }));
      continue;
    }
    const estado = estadoDeVersion(q.status);
    const venta = q.parameters?.salePriceMonthly ?? null;
    if (!venta || venta <= 0) avisos.push({ codigo: "cotizacion_sin_venta_mensual", idOpai1: q.id });
    if (cuentaNoModelada(q) > 0) avisos.push({ codigo: "cotizacion_con_costos_sin_modelo", idOpai1: q.id });
    const instalacion = q.installationId ? resolverInstalacion(q.installationId) : null;
    const datos: DatosCotizacion = {
      codigo: q.code.trim(),
      negocioIdOpai1: q.dealId,
      titulo: textoLimpio(q.name) ?? textoLimpio(q.clientName) ?? q.code.trim(),
      estado,
      moneda: (q.currency ?? "").trim().toUpperCase() === "CLP" ? "CLP" : "UF",
      validaHasta: q.validUntil ? q.validUntil.slice(0, 10) : null,
      enviadaEn: estado === "enviada" || estado === "aceptada" ? (q.sentAt ?? q.createdAt) : null,
      ventaMensualClp: venta && venta > 0 ? entero(venta) : null,
      margenModo: MODO_MARGEN[(q.parameters?.marginMode ?? "").trim()] ?? "margen_sobre_venta",
      meses: q.parameters?.contractMonths && q.parameters.contractMonths > 0 ? entero(q.parameters.contractMonths) : null,
      instalacionIdOpai1: instalacion ? q.installationId! : null,
      creadaEn: q.createdAt,
      vigente: false,
      lineas: [...q.positions]
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id.localeCompare(b.id))
        .map((p, i) => lineaDePuesto(p, i)),
    };
    decisiones.push(decision("cotizacion", q.id, "crear", { datos }));
    const lista = porNegocio.get(negocio) ?? [];
    lista.push({ id: q.id, puntaje: estado === "aceptada" ? 2 : estado === "rechazada" ? 0 : 1, creada: Date.parse(q.createdAt) });
    porNegocio.set(negocio, lista);
  }
  marcarVigentes(decisiones, porNegocio);
  return { decisiones, avisos };
}

/** Una sola vigente por negocio: la ganada y, si no hay, la más reciente que no esté rechazada. */
function marcarVigentes(
  decisiones: readonly Decision<DatosCotizacion>[],
  porNegocio: Map<string, { id: string; puntaje: number; creada: number }[]>,
): void {
  const porId = new Map(decisiones.map((d) => [d.idOpai1, d]));
  for (const lista of porNegocio.values()) {
    const [mejor] = [...lista].sort((a, b) => b.puntaje - a.puntaje || b.creada - a.creada || b.id.localeCompare(a.id));
    if (mejor && mejor.puntaje > 0 && porId.get(mejor.id)?.datos) porId.get(mejor.id)!.datos!.vigente = true;
  }
}

/** Cotizaciones que entran con los negocios que entran (crear, sin cambios o actualizar). */
export function planCotizacionesDeNegocios(
  filas: readonly CotizacionOpai1[],
  destino: EstadoDestino,
  negocios: readonly Decision<unknown>[],
  resolverInstalacion: (idOpai1: string) => string | null,
  activo: boolean,
): { decisiones: Decision<DatosCotizacion>[]; avisos: Aviso[] } {
  if (!activo) return { decisiones: [], avisos: [] };
  const entran = new Set(
    negocios.filter((d) => ["crear", "sin_cambios", "actualizar"].includes(d.accion)).map((d) => d.idOpai1),
  );
  return planCotizacionesCpq(
    filas,
    destino,
    (id) => (id && entran.has(id) ? id : null),
    (id) => (id ? resolverInstalacion(id) : null),
  );
}
