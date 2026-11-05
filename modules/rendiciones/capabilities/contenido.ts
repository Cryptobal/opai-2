// Contenido de una rendición según su tipo (CAR-194): compra = gastos del cliente; kilometraje = un
// solo gasto cuyo monto calcula el servidor. Lo comparten `crear` y `actualizar`.
import type { Contexto } from "@opai/capabilities";
import { reglaDeNegocio } from "@opai/capabilities";

import { totalRendicion } from "../domain";
import type { CuerpoEntrada, ItemEntrada } from "./esquemas";
import { avisosDuplicados, hoyChile, validarItems } from "./util";
import { calcularViaje, type CalculoViaje, type Viaje } from "./viaje";

export type TipoRendicion = "compra" | "kilometraje";
type Gasto = ItemEntrada;

export type Contenido = {
  tipo: TipoRendicion;
  items: Gasto[];
  montoTotal: number;
  advertencias: string[];
  viaje: { datos: Viaje; calculo: CalculoViaje } | null;
};

const kmTexto = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 1 });

/** El único gasto de un viaje: sin boleta (el respaldo es el cálculo), con el monto del servidor. */
function gastoDeViaje(v: Viaje, c: CalculoViaje): Gasto {
  const km = c.calculo.kmEfectivos;
  return {
    fecha: v.fecha,
    proveedor: "Kilometraje",
    monto: c.calculo.montoClp,
    tipoDocumento: "boleta",
    ...(v.peajeDocumentoId && v.peajeClp > 0 ? { documentoId: v.peajeDocumentoId } : {}),
    descripcion: `Viaje: ${v.origen.texto} → ${v.destino.texto} (${kmTexto(km)} km)`.slice(0, 200),
    sinRespaldoMotivo: "Kilometraje calculado por el sistema",
  };
}

/** Valida y arma el contenido; cualquier monto que mande el cliente en un viaje se descarta. */
export async function contenidoDe(ctx: Contexto, input: CuerpoEntrada, tipo: TipoRendicion, propiaId?: string): Promise<Contenido> {
  if (tipo === "kilometraje") {
    if (!input.viaje)
      throw reglaDeNegocio("Una rendición de kilometraje necesita los datos del viaje.");
    if (input.viaje.fecha > hoyChile()) throw reglaDeNegocio("El viaje tiene fecha futura.");
    const calculo = await calcularViaje(ctx, input.viaje);
    const items = [gastoDeViaje(input.viaje, calculo)];
    // La foto del peaje, si hay, debe ser un documento propio ya subido (la regla de siempre).
    await validarItems(ctx, items);
    return {
      tipo,
      items,
      montoTotal: calculo.calculo.montoClp,
      advertencias: calculo.calculo.advertencias,
      viaje: { datos: input.viaje, calculo },
    };
  }
  if (!input.items || input.items.length === 0) throw reglaDeNegocio("Agrega al menos un gasto.");
  await validarItems(ctx, input.items);
  const advertencias = await avisosDuplicados(ctx, input.items, propiaId);
  return { tipo, items: input.items, montoTotal: totalRendicion(input.items), advertencias, viaje: null };
}

/** Guarda (o reemplaza) el viaje con la instantánea de los parámetros usados. */
export async function guardarViaje(tx: Contexto["db"], tenantId: string, rendicionId: string, v: Viaje, c: CalculoViaje) {
  const datos = {
    tenantId, origenTexto: v.origen.texto, origenLat: v.origen.lat, origenLng: v.origen.lng,
    destinoTexto: v.destino.texto, destinoLat: v.destino.lat, destinoLng: v.destino.lng, km: c.calculo.km,
    idaYVuelta: v.idaYVuelta, peajeClp: v.peajeClp, metodo: c.config.metodo, origenDistancia: c.calculo.origenDistancia,
    montoCalculado: c.calculo.montoClp,
    configSnapshot: { config: c.config, tramo: v.tramo ?? null, desglose: c.calculo.desglose },
  };
  // tenantId explícito también al buscar: nunca se toca el viaje de otra empresa, aunque la RLS ya lo impide.
  const n = await tx.rendicionViaje.updateMany({ where: { rendicionId, tenantId }, data: datos });
  if (n.count === 0) await tx.rendicionViaje.create({ data: { ...datos, rendicionId } });
}
