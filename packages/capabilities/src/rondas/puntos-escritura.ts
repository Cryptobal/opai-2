import { randomUUID } from "node:crypto";

import { z } from "zod";

import { permanenciaDefecto } from "@opai/domain";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, sinDuplicado } from "../core/maestros/comun";
import {
  PERMISO_CONFIG,
  defecto,
  instalacionEnAlcance,
  modoSchema,
  puntoDe,
} from "./comun";
import { puntoSchema, vistaPunto } from "./vistas";

const camposPunto = {
  modo: modoSchema.optional().describe("QR, GPS o QR + GPS; por defecto el del tenant (R1)."),
  estricto: z.boolean().optional().describe("Modo estricto: QR fuera de la geocerca es anomalía (R2)."),
  latitud: z.number().min(-90).max(90).nullable().optional(),
  longitud: z.number().min(-180).max(180).nullable().optional(),
  radioM: z.number().int().min(5).max(200).nullable().optional().describe("Radio de la geocerca (R3)."),
  precisionMinM: z.number().int().min(5).max(100).nullable().optional(),
  permanenciaS: z.number().int().min(0).max(300).optional(),
  exigeFoto: z.boolean().optional(),
  instrucciones: z.string().trim().max(500).nullable().optional(),
};

const incluyeGps = (modo: string) => modo === "gps" || modo === "qr_gps";
const incluyeQr = (modo: string) => modo === "qr" || modo === "qr_gps";
const num = (d: { toString(): string } | number | null): number | null =>
  d == null ? null : Number(d);

/** Crea un punto de control en una instalación (modo, coordenadas, radio, precisión, permanencia). */
export const puntosCrear = defineCapability({
  id: "rondas.puntos.crear",
  descripcion:
    "Crea un punto de control en una instalación con su modo de verificación (QR, GPS o QR + GPS), coordenadas, radio de geocerca, precisión mínima, permanencia, si exige foto e instrucciones.",
  permiso: PERMISO_CONFIG,
  input: z.object({ instalacionId: uuidSchema, nombre: z.string().trim().min(2).max(80), ...camposPunto }),
  output: puntoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    const modo = input.modo ?? (await defecto<string>(ctx, "modo_defecto"));
    if (incluyeGps(modo) && (input.latitud == null || input.longitud == null))
      throw reglaDeNegocio("Un punto con GPS necesita coordenadas.");
    const conGps = incluyeGps(modo);
    const radioM = conGps ? (input.radioM ?? (await defecto<number>(ctx, "radio_defecto_m"))) : null;
    const precisionMinM = conGps
      ? (input.precisionMinM ?? (await defecto<number>(ctx, "precision_min_defecto_m")))
      : null;
    const permanenciaS = input.permanenciaS ?? permanenciaDefecto(modo === "gps");
    const data = definidos({
      instalacionId: input.instalacionId,
      nombre: input.nombre,
      modo,
      estado: "activo",
      estricto: input.estricto ?? false,
      latitud: conGps ? input.latitud : null,
      longitud: conGps ? input.longitud : null,
      radioM,
      precisionMinM,
      permanenciaS,
      exigeFoto: input.exigeFoto ?? false,
      instrucciones: input.instrucciones ?? null,
    });
    if (dryRun) {
      return vistaPunto({
        ...data,
        id: "",
        estado: "activo",
        etiquetaQr: null,
        createdAt: new Date(),
      });
    }
    // Identificador opaco de la etiqueta (R7); la firma y la rotación llegan en el PR 2.
    const etiquetaQr = incluyeQr(modo) ? `RQR-${randomUUID().replace(/-/g, "")}` : null;
    const creado = await sinDuplicado(
      ctx.db.puntoControl.create({ data: { ...data, etiquetaQr, tenantId: ctx.tenantId } }),
      "Ya existe un punto con ese nombre en la instalación.",
    );
    return vistaPunto(creado);
  },
});

/** Edita un punto de control; no cambia su instalación. */
export const puntosActualizar = defineCapability({
  id: "rondas.puntos.actualizar",
  descripcion:
    "Edita un punto de control existente: nombre, modo, coordenadas, radio, precisión mínima, permanencia, si exige foto e instrucciones. No cambia la instalación.",
  permiso: PERMISO_CONFIG,
  input: z.object({ id: uuidSchema, nombre: z.string().trim().min(2).max(80).optional(), ...camposPunto }),
  output: puntoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const punto = await puntoDe(ctx, id);
    const modo = cambios.modo ?? punto.modo;
    const conGps = incluyeGps(modo);
    const lat = cambios.latitud !== undefined ? cambios.latitud : num(punto.latitud);
    const lng = cambios.longitud !== undefined ? cambios.longitud : num(punto.longitud);
    if (conGps && (lat == null || lng == null))
      throw reglaDeNegocio("Un punto con GPS necesita coordenadas.");
    const data = definidos({
      nombre: cambios.nombre,
      modo: cambios.modo,
      estricto: cambios.estricto,
      latitud: cambios.latitud,
      longitud: cambios.longitud,
      radioM: cambios.radioM,
      precisionMinM: cambios.precisionMinM,
      permanenciaS: cambios.permanenciaS,
      exigeFoto: cambios.exigeFoto,
      instrucciones: cambios.instrucciones,
    });
    const fila = dryRun
      ? { ...punto, ...data }
      : await sinDuplicado(
          ctx.db.puntoControl.update({ where: { id }, data }),
          "Ya existe un punto con ese nombre en la instalación.",
        );
    return vistaPunto(fila);
  },
});

/** Archiva un punto de control (un punto con marcas nunca se borra, se archiva). */
export const puntosArchivar = defineCapability({
  id: "rondas.puntos.archivar",
  descripcion:
    "Archiva un punto de control: deja de usarse en plantillas y programaciones futuras, pero las ejecuciones pasadas lo conservan. No borra datos.",
  permiso: PERMISO_CONFIG,
  input: z.object({ id: uuidSchema }),
  output: puntoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const punto = await puntoDe(ctx, id);
    if (dryRun) return vistaPunto({ ...punto, estado: "archivado" });
    const fila = await ctx.db.puntoControl.update({ where: { id }, data: { estado: "archivado" } });
    return vistaPunto(fila);
  },
});
