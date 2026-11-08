import { z } from "zod";

import {
  VERSION_CATALOGO_CAMPOS,
  clasificarCampos,
  soloAutorizados,
  valoresContacto,
  valoresCuenta,
  valoresInstalacion,
  type FinalidadCampo,
  type ValorCampo,
} from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { dondeInstalacion } from "../maestros/alcance";
import { cuentaDe } from "../maestros/cuentas-acceso";

export const MAX_INSTALACIONES = 50;
export const valorSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const registroSchema = z.record(z.string(), valorSchema);
export type RegistroCampos = z.infer<typeof registroSchema>;

/** Fechas como `AAAA-MM-DD`; el formato de presentación lo aplica `renderizarPlantillaCampos`. */
function serializable(v: Record<string, ValorCampo>): RegistroCampos {
  return Object.fromEntries(
    Object.entries(v).map(([k, x]) => [
      k,
      x instanceof Date ? x.toISOString().slice(0, 10) : (x ?? null),
    ]),
  );
}

export type EntradaValoresCampos = {
  finalidad: FinalidadCampo;
  cuentaId: string;
  contactoId?: string | undefined;
  instalacionIds?: string[] | undefined;
};

export type ValoresCamposResueltos = {
  version: number;
  finalidad: FinalidadCampo;
  campos: RegistroCampos;
  colecciones: { instalaciones: RegistroCampos[] };
  origen: { cuentaId: string; contactoId: string | null; instalacionIds: string[] };
  sinPermiso: string[];
  sinResolvedor: string[];
};

/**
 * Valores del catálogo para un documento: solo lo que la finalidad permite y el actor puede leer,
 * con el alcance aplicado en la consulta. Lo usan `core.campos.valores` y los módulos que congelan
 * el contrato al enviar (CPQ); no hay otra lectura de maestros para llenar variables.
 */
export async function resolverCamposDocumento(
  ctx: Contexto,
  input: EntradaValoresCampos,
): Promise<ValoresCamposResueltos> {
  const clases = clasificarCampos(input.finalidad, (p) => ctx.autorizar(p));
  const permitidas = new Set(clases.autorizados.map((c) => c.clave));
  const cuenta = await cuentaDe(ctx, input.cuentaId);

  // El contacto puede ser de la cuenta de origen o estar vinculado a ella (N–N); el alcance ya se
  // aplicó al exigir la cuenta. Con vínculo, el cargo es el que tiene en esa cuenta.
  const [contacto, vinculo] = input.contactoId
    ? await Promise.all([
        ctx.db.contacto.findFirst({
          where: { id: input.contactoId, archivadoEn: null, anonimizadoEn: null },
        }),
        ctx.db.contactoCuenta.findFirst({
          where: { contactoId: input.contactoId, cuentaId: cuenta.id },
        }),
      ])
    : [null, null];
  if (input.contactoId && (!contacto || (contacto.cuentaId !== cuenta.id && !vinculo))) {
    throw noEncontrado("El contacto");
  }

  const instalaciones = await ctx.db.instalacion.findMany({
    where: {
      cuentaId: cuenta.id,
      archivadaEn: null,
      ...(input.instalacionIds ? { id: { in: input.instalacionIds } } : {}),
      AND: [dondeInstalacion(ctx)],
    },
    orderBy: { nombre: "asc" },
    take: MAX_INSTALACIONES + 1,
  });
  if (!input.instalacionIds && instalaciones.length > MAX_INSTALACIONES) {
    throw reglaDeNegocio(
      `La cuenta tiene más de ${MAX_INSTALACIONES} instalaciones: elige cuáles incluir en el documento.`,
    );
  }
  const pedidas = new Set(input.instalacionIds ?? []);
  if (pedidas.size > 0 && instalaciones.length !== pedidas.size) {
    throw noEncontrado("La instalación");
  }

  const campos = {
    ...valoresCuenta(cuenta),
    ...(contacto ? valoresContacto({ ...contacto, cargo: vinculo?.cargo ?? contacto.cargo }) : {}),
  };
  return {
    version: VERSION_CATALOGO_CAMPOS,
    finalidad: input.finalidad,
    campos: serializable(soloAutorizados(campos, permitidas)),
    colecciones: {
      instalaciones: instalaciones.map((i) =>
        serializable(soloAutorizados(valoresInstalacion(i), permitidas)),
      ),
    },
    origen: {
      cuentaId: cuenta.id,
      contactoId: contacto?.id ?? null,
      instalacionIds: instalaciones.map((i) => i.id),
    },
    sinPermiso: clases.sinPermiso.map((c) => c.clave),
    sinResolvedor: clases.sinResolvedor.map((c) => c.clave),
  };
}
