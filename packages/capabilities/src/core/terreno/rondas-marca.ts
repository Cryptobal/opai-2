import { evaluarMarcaPunto, RADIO_GEOCERCA_M, coordenada, type ModoPunto } from "@opai/domain";

import type { Contexto } from "../../types";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

/** Precisión mínima aceptada cuando el punto no define una (R3: se calibra con marcas reales). */
const PRECISION_MIN_DEFECTO_M = 20;

export type MarcaResuelta = {
  puntoId: string;
  geocerca: string;
  distanciaM: number | null;
  precisionM: number | null;
  anomalias: string[];
  /** Clave de la ronda a la que pertenece la marca, si vino. */
  ejecucionClave: string | null;
};
export type ResolucionMarca = { motivo: "qr_invalido" | "qr_ajeno" } | { marca: MarcaResuelta };

type Entrada = { clave: string; tipo: string; payload: unknown };

/**
 * Decide, para los hechos `rondas.marca` de un lote, a qué punto corresponden. El punto debe ser de la
 * instalación del equipo: el QR de otra instalación (o de otra empresa, que la RLS ni deja ver) se rechaza y
 * el resto del lote sigue. Solo lee; quien llama inserta la marca junto con el hecho.
 */
export async function resolverMarcas(
  ctx: Contexto,
  instalacionId: string,
  hechos: readonly Entrada[],
): Promise<Map<string, ResolucionMarca>> {
  const pedidas = hechos.flatMap((h) => {
    if (h.tipo !== "rondas.marca") return [];
    const r = TIPOS_HECHO_TERRENO["rondas.marca"].safeParse(h.payload);
    return r.success ? [{ clave: h.clave, p: r.data }] : [];
  });
  const salida = new Map<string, ResolucionMarca>();
  if (pedidas.length === 0) return salida;
  const codigos = [...new Set(pedidas.flatMap(({ p }) => (p.codigo ? [p.codigo] : [])))];
  const ids = [...new Set(pedidas.flatMap(({ p }) => (p.puntoId ? [p.puntoId] : [])))];
  const select = {
    id: true,
    instalacionId: true,
    modo: true,
    estricto: true,
    latitud: true,
    longitud: true,
    radioM: true,
    precisionMinM: true,
    estado: true,
  } as const;
  const [etiquetas, puntos] = await Promise.all([
    codigos.length
      ? ctx.db.etiquetaQr.findMany({
          where: { codigo: { in: codigos } },
          select: { codigo: true, estado: true, punto: { select } },
        })
      : [],
    ids.length ? ctx.db.puntoControl.findMany({ where: { id: { in: ids } }, select }) : [],
  ]);
  const porCodigo = new Map(etiquetas.map((e) => [e.codigo, e]));
  const porId = new Map(puntos.map((p) => [p.id, p]));
  for (const { clave, p } of pedidas) {
    const et = p.codigo ? porCodigo.get(p.codigo) : undefined;
    const punto = p.codigo ? et?.punto : porId.get(p.puntoId ?? "");
    if (!punto || punto.estado !== "activo") {
      salida.set(clave, { motivo: "qr_invalido" });
      continue;
    }
    if (punto.instalacionId !== instalacionId) {
      salida.set(clave, { motivo: "qr_ajeno" });
      continue;
    }
    // Sin QR solo vale un punto que se verifica solo por GPS (R1).
    if (!p.codigo && punto.modo !== "gps") {
      salida.set(clave, { motivo: "qr_invalido" });
      continue;
    }
    if (p.codigo && p.puntoId && p.puntoId !== punto.id) {
      salida.set(clave, { motivo: "qr_invalido" });
      continue;
    }
    const lectura = p.lectura
      ? { lat: p.lectura.lat, lng: p.lectura.lng, precisionM: p.lectura.precisionM }
      : null;
    const r = evaluarMarcaPunto({
      modo: punto.modo as ModoPunto,
      estricto: punto.estricto,
      centro: coordenada(
        punto.latitud === null ? null : Number(punto.latitud),
        punto.longitud === null ? null : Number(punto.longitud),
      ),
      radioM: punto.radioM ?? RADIO_GEOCERCA_M.defecto,
      precisionMinM: punto.precisionMinM ?? PRECISION_MIN_DEFECTO_M,
      lectura,
      etiquetaReemplazada: et?.estado === "reemplazada",
    });
    salida.set(clave, {
      marca: {
        puntoId: punto.id,
        geocerca: r.geocerca,
        distanciaM: r.distanciaM,
        precisionM: lectura ? lectura.precisionM : null,
        anomalias: r.anomalias,
        ejecucionClave: p.ejecucionClave ?? null,
      },
    });
  }
  return salida;
}
