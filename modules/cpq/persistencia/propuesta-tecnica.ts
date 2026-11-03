import type { Contexto } from "@opai/capabilities";
import { noEncontrado, reglaDeNegocio, uuid7 } from "@opai/capabilities";

import type { BasePlantilla } from "../domain/documento/bloques";
import {
  basePropuestaDesdeCotizacion,
  cotizacionServicioCambio,
  huellaServicioCotizacion,
  parseBloquesArmadorPropuesta,
  type BloqueArmadorPropuesta,
  type ServicioDesdeCotizacion,
} from "../domain/documento/propuesta-tecnica";
import { plantillaActivaCotizacionLectura } from "./plantilla-documento";
import { plantillaActivaPropuesta, vistaPlantillaPropuesta } from "./plantilla-propuesta";

export function servicioDesdeFilas(input: {
  codigo: string;
  versionNumero: number;
  secciones: readonly {
    nombre: string;
    lineas: readonly {
      nombre: string;
      tipo: string;
      posiciones: number;
      patron: string | null;
      horaInicio: string | null;
      horaFin: string | null;
      diasCobertura: number | null;
    }[];
  }[];
}): ServicioDesdeCotizacion {
  return {
    codigo: input.codigo,
    versionNumero: input.versionNumero,
    secciones: input.secciones.map((s) => ({
      nombre: s.nombre,
      puestos: s.lineas
        .filter((l) => l.tipo === "puesto")
        .map((l) => ({
          nombre: l.nombre,
          posiciones: l.posiciones,
          patron: l.patron,
          horaInicio: l.horaInicio,
          horaFin: l.horaFin,
          diasCobertura: l.diasCobertura,
        })),
    })),
  };
}

export async function obtenerOCrearPropuestaTecnica(
  ctx: Contexto,
  cotizacionId: string,
  versionId: string,
  creadoPorId: string,
) {
  const existente = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { versionId } });
  if (existente) return existente;
  const plantillaCot = await plantillaActivaCotizacionLectura(ctx);
  const plantillaProp = vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx));
  const base = basePropuestaDesdeCotizacion(plantillaCot.base, plantillaProp.base as BasePlantilla);
  const bloques: BloqueArmadorPropuesta[] = plantillaProp.bloques
    .filter((b) => b.activo)
    .map((b, i) => ({
      ...b,
      id: `${b.tipo}-${i}`,
    }));
  return ctx.db.cpqPropuestaTecnica.create({
    data: {
      id: uuid7(),
      tenantId: ctx.tenantId,
      cotizacionId,
      versionId,
      base,
      plantillaDocumentoId: plantillaProp.id,
      plantillaDocumentoVersion: plantillaProp.version,
      estado: "borrador",
      bloquesJson: JSON.stringify(bloques),
      creadoPorId,
    },
  });
}

export async function actualizarPropuestaArmador(
  ctx: Contexto,
  propuestaId: string,
  input: { bloques?: BloqueArmadorPropuesta[]; base?: BasePlantilla; editadoParaCliente?: boolean },
  escribir: boolean,
) {
  const row = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: propuestaId } });
  if (!row) throw noEncontrado("La propuesta técnica");
  if (row.estado === "congelada") throw reglaDeNegocio("La propuesta está congelada tras el envío.");
  const data = {
    ...(input.bloques ? { bloquesJson: JSON.stringify(input.bloques) } : {}),
    ...(input.base ? { base: input.base } : {}),
    ...(input.editadoParaCliente !== undefined ? { editadoParaCliente: input.editadoParaCliente } : {}),
  };
  if (!escribir) return { ...row, ...data };
  return ctx.db.cpqPropuestaTecnica.update({ where: { id: row.id }, data });
}

export async function sincronizarServicioDesdeCotizacion(
  ctx: Contexto,
  propuestaId: string,
  servicio: ServicioDesdeCotizacion,
  escribir: boolean,
) {
  const row = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: propuestaId } });
  if (!row) throw noEncontrado("La propuesta técnica");
  if (row.estado === "congelada") throw reglaDeNegocio("La propuesta está congelada.");
  const huella = huellaServicioCotizacion(servicio);
  const data = {
    servicioHuellaJson: huella,
    servicioEditadoJson: null,
    editadoParaCliente: false,
  };
  if (!escribir) return { ...row, ...data };
  return ctx.db.cpqPropuestaTecnica.update({ where: { id: row.id }, data });
}

export function propuestaServicioDesactualizado(
  row: { servicioHuellaJson: string | null },
  servicio: ServicioDesdeCotizacion,
) {
  return cotizacionServicioCambio(row.servicioHuellaJson, servicio);
}

export function parseArmador(json: string) {
  return parseBloquesArmadorPropuesta(json);
}

export async function congelarPropuestaTecnica(ctx: Contexto, propuestaId: string) {
  const row = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: propuestaId } });
  if (!row) throw noEncontrado("La propuesta técnica");
  if (row.estado === "congelada") return row;
  return ctx.db.cpqPropuestaTecnica.update({
    where: { id: row.id },
    data: { estado: "congelada" },
  });
}
