import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, reglaDeNegocio } from "../../errores";
import { aFecha, dia, hoy } from "../maestros/comun";
import { requierePlataforma } from "../comun";

const precioSchema = z.object({
  recurso: z.string(),
  unidad: z.string(),
  costoUnitarioMicro: z.number().describe("Micro-USD por unidad (1 USD = 1.000.000)."),
  vigenteDesde: z.string(),
});

export const platformPreciosList = defineCapability({
  id: "platform.precios.list",
  descripcion:
    "Plataforma: precio vigente hoy de cada recurso con costo (IA, correos, geolocalización, almacenamiento, ejecuciones) que se cobra a las empresas.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({}),
  output: z.array(precioSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await requierePlataforma(ctx).globales.listarPrecios(aFecha(hoy()));
    const vistos = new Set<string>();
    return filas
      .filter((f) => !vistos.has(f.recurso) && vistos.add(f.recurso))
      .map((f) => ({ ...f, vigenteDesde: dia(f.vigenteDesde) ?? "" }));
  },
});

export const platformPreciosSet = defineCapability({
  id: "platform.precios.set",
  descripcion:
    "Plataforma: fija un nuevo precio para un recurso desde una fecha (por defecto hoy). Versiona: el precio anterior queda para los consumos ya medidos.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    recurso: z.string().trim().min(3).max(80),
    unidad: z.string().trim().min(1).max(40),
    costoUnitarioMicro: z.number().int().min(0).max(1_000_000_000),
    vigenteDesde: z.iso.date().optional(),
  }),
  output: precioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const desde = input.vigenteDesde ?? hoy();
    // Versiona sin reescribir historia: nunca hacia atrás, y la versión de hoy no se corrige
    // (los consumos de hoy ya la usan); una versión futura sí puede ajustarse.
    if (desde < hoy()) throw reglaDeNegocio("La fecha de vigencia no puede ser pasada.");
    const existente = await requierePlataforma(ctx).globales.precioPorVigencia({
      recurso_vigenteDesde: { recurso: input.recurso, vigenteDesde: aFecha(desde) },
    });
    if (existente && desde === hoy())
      throw conflicto("Ya hay un precio vigente desde hoy: fija el nuevo desde mañana.");
    const fila = {
      recurso: input.recurso,
      unidad: input.unidad,
      costoUnitarioMicro: input.costoUnitarioMicro,
    };
    if (!dryRun)
      await requierePlataforma(ctx).globales.guardarPrecio({
        where: { recurso_vigenteDesde: { recurso: input.recurso, vigenteDesde: aFecha(desde) } },
        create: { ...fila, vigenteDesde: aFecha(desde) },
        update: fila,
      });
    return { ...fila, vigenteDesde: desde };
  },
});
