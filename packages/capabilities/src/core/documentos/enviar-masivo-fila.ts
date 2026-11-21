import type { ClaseFirma, NivelFirma } from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { firmantesLaborales } from "./firmantes-laborales";
import { calcularRelleno } from "./rellenar-calculo";
import { ejecutarFilaMasivo } from "./enviar-masivo-fila-ejecutar";

export type FilaEnvioMasivo = {
  personaId: string;
  estado: "ok" | "error" | "omitido";
  nombre: string;
  documentoId: string | null;
  solicitudFirmaId: string | null;
  mensaje: string | null;
};

type PlantillaLote = {
  id: string;
  nombre: string;
  clase: string;
  nivelFirma: string;
  firmantes: string | null;
};

type VersionLote = { numero: number };

export async function filaEnvioMasivo(
  ctx: Contexto,
  opts: {
    plantilla: PlantillaLote;
    version: VersionLote;
    personaId: string;
    fecha: string;
    clase: ClaseFirma;
    nivel: NivelFirma;
    mensaje?: string;
    dryRun: boolean;
  },
): Promise<FilaEnvioMasivo> {
  let nombre = opts.personaId;
  try {
    const { persona, relleno, faltantes } = await calcularRelleno(ctx, {
      plantillaId: opts.plantilla.id,
      personaId: opts.personaId,
      fecha: opts.fecha,
    });
    nombre = `${persona.nombres} ${persona.apellidos}`.trim();
    if (faltantes.length)
      throw reglaDeNegocio(`Faltan datos: ${faltantes.map((f) => f.etiqueta).join(", ")}.`);
    const firmantes = await firmantesLaborales(
      ctx,
      { firmantes: (opts.plantilla.firmantes ?? "ambos") as "ambos" },
      persona,
    );
    return ejecutarFilaMasivo(ctx, { ...opts, persona, relleno, nombre, firmantes });
  } catch (e) {
    return {
      personaId: opts.personaId,
      estado: "error",
      nombre,
      documentoId: null,
      solicitudFirmaId: null,
      mensaje: e instanceof Error ? e.message : "No se pudo procesar.",
    };
  }
}