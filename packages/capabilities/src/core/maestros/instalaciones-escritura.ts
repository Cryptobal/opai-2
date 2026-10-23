import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento, opcionalAFecha, otroQue, sinDuplicado } from "./comun";
import { cuentaDe } from "./cuentas";
import { instalacionDe } from "./instalaciones";
import { ubicar } from "./instalaciones-geo";
import { camposInstalacion, instalacionSchema, vistaInstalacion } from "./instalaciones-vista";

const DUPLICADO = "La cuenta ya tiene una instalación con ese nombre.";
const salida = instalacionSchema.extend({
  avisos: z.array(z.string()).describe("Avisos no bloqueantes (p. ej. sin coordenadas)."),
});

async function nombreLibre(ctx: Contexto, cuentaId: string, nombre?: string, excepto?: string) {
  if (!nombre) return;
  const otra = await ctx.db.instalacion.findFirst({
    where: { cuentaId, nombre, ...otroQue(excepto) },
  });
  if (otra) throw conflicto(DUPLICADO);
}

const fechas = (d: {
  vigenteDesde?: string | null | undefined;
  vigenteHasta?: string | null | undefined;
}) => ({
  vigenteDesde: opcionalAFecha(d.vigenteDesde),
  vigenteHasta: opcionalAFecha(d.vigenteHasta),
});

export const instalacionesCreate = defineCapability({
  id: "core.instalaciones.create",
  descripcion:
    "Crea una instalación de una cuenta. Si trae dirección sin coordenadas la ubica en el mapa; si no se puede, la guarda igual y lo avisa.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({
    cuentaId: uuidSchema,
    estado: z.enum(["prospecto", "activa"]).default("prospecto"),
    ...camposInstalacion,
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    await nombreLibre(ctx, cuenta.id, input.nombre);
    const geo = await ubicar(ctx, input, dryRun);
    const data = definidos({ ...input, ...fechas(input), ...geo.datos });
    if (dryRun)
      return { ...vistaInstalacion({ ...data, id: "" }, cuenta.nombre), avisos: geo.avisos };
    const i = await escribirConEvento(
      ctx,
      { tipo: "core.instalacion.creada", entidadTipo: "instalacion" },
      (tx) =>
        sinDuplicado(
          tx.instalacion.create({ data: { ...data, tenantId: ctx.tenantId } }),
          DUPLICADO,
        ),
    );
    return { ...vistaInstalacion(i, cuenta.nombre), avisos: geo.avisos };
  },
});

export const instalacionesUpdate = defineCapability({
  id: "core.instalaciones.update",
  descripcion:
    "Actualiza una instalación (nombre, dirección, coordenadas, geocerca, vigencia, notas). Si cambia la dirección sin coordenadas, la vuelve a ubicar.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, ...z.object(camposInstalacion).partial().shape }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await instalacionDe(ctx, id);
    await nombreLibre(ctx, actual.cuentaId, cambios.nombre, id);
    const cambiaDireccion = cambios.calle !== undefined || cambios.comuna !== undefined;
    const geo = cambiaDireccion
      ? await ubicar(ctx, { ...actual, lat: null, lng: null, ...cambios }, dryRun)
      : { datos: {}, avisos: [] };
    const sinCoordenadas = cambiaDireccion && cambios.lat === undefined && !geo.datos.lat;
    const data = definidos({
      ...cambios,
      ...fechas(cambios),
      ...(sinCoordenadas ? { lat: null, lng: null, placeId: null, direccionFormateada: null } : {}),
      ...geo.datos,
    });
    const cuenta = (await cuentaDe(ctx, actual.cuentaId)).nombre;
    if (dryRun) return { ...vistaInstalacion({ ...actual, ...data }, cuenta), avisos: geo.avisos };
    const i = await escribirConEvento(
      ctx,
      {
        tipo: "core.instalacion.actualizada",
        entidadTipo: "instalacion",
        payload: () => ({ campos: Object.keys(data) }),
      },
      (tx) => sinDuplicado(tx.instalacion.update({ where: { id }, data }), DUPLICADO),
    );
    return { ...vistaInstalacion(i, cuenta), avisos: geo.avisos };
  },
});
