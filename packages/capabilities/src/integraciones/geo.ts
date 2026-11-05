import {
  type Distancia,
  distanciaLineaRecta,
  ErrorGoogle,
  geoGoogle,
  type Punto,
  puntoValido,
  type OpcionesMapa,
  variantesDeBusqueda,
} from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { consumoBase } from "./consumo-base";
import { credencialDe } from "./resolver";

/**
 * Geolocalización medida (ADR-027, ADR-031), o null si no hay credencial en este entorno. Cada
 * llamada se registra en `core.consumos` con la unidad de su precio base: consulta, o imagen para
 * `geo.mapa`.
 */
export async function geoDe(ctx: Contexto, modulo = "core") {
  const cred = await credencialDe(ctx, "google_maps");
  if (!cred) return null;
  const geo = geoGoogle(cred.valor);
  // Google ya cobró la llamada antes de medirla: se registra siempre (yaIncurrido), nunca se pierde.
  const medir = (recurso: string, unidad = "consulta") =>
    ctx.medidor
      .registrar({
        ...consumoBase(ctx, modulo),
        recurso,
        unidad,
        cantidad: 1,
        sinCosto: cred.modalidad === "propia",
        yaIncurrido: true,
      })
      .catch(() => undefined);
  // La falla de Google llega a la pantalla y a los agentes con su estado y mensaje (nunca la clave).
  const conMensaje = async <T>(llamada: () => Promise<T>): Promise<T> => {
    try {
      return await llamada();
    } catch (e) {
      throw e instanceof ErrorGoogle ? reglaDeNegocio(e.message) : e;
    }
  };
  return {
    /** Si la dirección completa no devuelve nada, reintenta sin región y luego solo con la calle. */
    async autocompletar(texto: string, sesion?: string) {
      let r: Awaited<ReturnType<typeof geo.autocompletar>> = [];
      for (const variante of variantesDeBusqueda(texto)) {
        r = await conMensaje(() => geo.autocompletar(variante, sesion));
        if (r.length > 0) break;
      }
      await medir("geo.autocompletado"); // una consulta lógica = un consumo, aunque se reintente
      return r;
    },
    async detalle(placeId: string, sesion?: string) {
      const r = await conMensaje(() => geo.detalle(placeId, sesion));
      await medir("geo.geocodificacion");
      return r;
    },
    async geocodificar(direccion: string) {
      const r = await conMensaje(() => geo.geocodificar(direccion));
      await medir("geo.geocodificacion");
      return r;
    },
    /** Imagen del mapa; se mide solo si Google la entregó (un error no consume). */
    async mapa(lat: number, lng: number, opciones?: OpcionesMapa) {
      const r = await conMensaje(() => geo.mapa(lat, lng, opciones));
      await medir("geo.mapa", "imagen");
      return r;
    },
    /**
     * Km entre dos puntos (CAR-194). Se mide `geo.ruta` solo si respondió Google; si falló, o la
     * empresa no tiene clave de mapas, devuelve la línea recta con su origen y no consume.
     */
    async distancia(origen: Punto, destino: Punto): Promise<Distancia> {
      const r = await geo.distancia(origen, destino);
      if (r.origenDistancia === "google") await medir("geo.ruta");
      return r;
    },
    urlMapa: geo.urlMapa,
  };
}

/** Distancia medida entre dos puntos; sin credencial de Google responde en línea recta. */
export async function distanciaDe(ctx: Contexto, origen: Punto, destino: Punto, modulo = "core"): Promise<Distancia> {
  if (!puntoValido(origen) || !puntoValido(destino)) throw reglaDeNegocio("Las coordenadas del viaje no son válidas.");
  const geo = await geoDe(ctx, modulo);
  return geo ? geo.distancia(origen, destino) : distanciaLineaRecta(origen, destino);
}
