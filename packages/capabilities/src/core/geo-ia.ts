import { z } from "zod";

import { CLASES_TAREA } from "@opai/integrations";
import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { geoDe, iaDe } from "../integraciones/adaptadores";
import { externo } from "../externo";

const direccionSchema = z.object({
  placeId: z.string().nullable(),
  direccionFormateada: externo(z.string()),
  calle: z.string().nullable(),
  comuna: z.string().nullable(),
  region: z.string().nullable(),
  pais: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

async function geoRequerido(ctx: Parameters<typeof geoDe>[0]) {
  const geo = await geoDe(ctx);
  if (!geo) throw reglaDeNegocio("La geolocalización no está disponible en este entorno.");
  return geo;
}

export const geoAutocompletar = defineCapability({
  id: "core.geo.autocompletar",
  descripcion:
    "Sugerencias de direcciones en Chile para un texto (autocompletado). Devuelve placeId para pedir el detalle con core.geo.detalle.",
  permiso: null,
  input: z.object({
    texto: z.string().trim().min(3).max(200),
    sesion: z.string().max(100).optional(),
  }),
  output: z.array(
    z.object({
      placeId: z.string(),
      texto: externo(z.string()),
      secundario: z.string().nullable(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => (await geoRequerido(ctx)).autocompletar(input.texto, input.sesion),
});

export const geoDetalle = defineCapability({
  id: "core.geo.detalle",
  descripcion:
    "Dirección normalizada (calle, comuna, región, coordenadas) de una sugerencia de autocompletado.",
  permiso: null,
  input: z.object({ placeId: z.string().min(3).max(300), sesion: z.string().max(100).optional() }),
  output: direccionSchema.nullable(),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => (await geoRequerido(ctx)).detalle(input.placeId, input.sesion),
});

export const geoGeocodificar = defineCapability({
  id: "core.geo.geocodificar",
  descripcion:
    "Convierte una dirección escrita en Chile en dirección normalizada con coordenadas, o null si no la encuentra.",
  permiso: null,
  input: z.object({ direccion: z.string().trim().min(5).max(300) }),
  output: direccionSchema.nullable(),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => (await geoRequerido(ctx)).geocodificar(input.direccion),
});

/**
 * Interna: la imagen viaja en base64 solo hacia el proxy `/api/geo/mapa` del navegador (las <img>
 * de las fichas); un agente no tiene qué hacer con ella, y lo suyo son las coordenadas de
 * `core.geo.detalle`. Mide `geo.mapa` (ADR-031).
 */
export const geoMapa = defineCapability({
  id: "core.geo.mapa",
  descripcion:
    "Imagen del mapa (PNG) centrada en unas coordenadas con su marcador, para las fichas y formularios; se mide como geo.mapa.",
  permiso: null,
  interna: true,
  portales: ["erp", "supervisor"],
  input: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    zoom: z.number().int().min(10).max(18).default(16),
  }),
  output: z.object({ mime: z.string(), base64: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const geo = await geoRequerido(ctx);
    const img = await geo.mapa(input.lat, input.lng, { zoom: input.zoom });
    return { mime: img.mime, base64: Buffer.from(img.bytes).toString("base64") };
  },
});

export const iaProbar = defineCapability({
  id: "core.ia.probar",
  descripcion:
    "Hace una llamada mínima a la IA de una clase de tarea (económica, estándar o potente) y devuelve proveedor, modelo y tokens.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({ clase: z.enum(CLASES_TAREA) }),
  output: z.object({
    proveedor: z.string(),
    modelo: z.string(),
    tokensEntrada: z.number(),
    tokensSalida: z.number(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ia = await iaDe(ctx, input.clase);
    if (!ia)
      throw reglaDeNegocio(
        "No hay una IA disponible: configura una credencial propia o la de plataforma.",
      );
    const r = await ia.completar({ prompt: "Responde solo: ok", maxTokens: 5 });
    return {
      proveedor: r.proveedor,
      modelo: r.modelo,
      tokensEntrada: r.tokensEntrada,
      tokensSalida: r.tokensSalida,
    };
  },
});
