import type { ClaseFirma, NivelFirma } from "@opai/domain";

import type { Contexto } from "../../types";
import { ejecutarEnvioFirma } from "../firmas/enviar-ejecutar";
import { generarPdfLaboralPersona } from "./generar-pdf-persona";
import type { FilaEnvioMasivo } from "./enviar-masivo-fila";
import type { FirmanteInput } from "../firmas/enviar-util";

type PersonaLote = { id: string; nombres: string; apellidos: string; rut: string };

export async function ejecutarFilaMasivo(
  ctx: Contexto,
  opts: {
    plantilla: { id: string; nombre: string; clase: string; nivelFirma: string; firmantes: string | null };
    version: { numero: number };
    personaId: string;
    persona: PersonaLote;
    relleno: { parrafos: Parameters<typeof generarPdfLaboralPersona>[4]["parrafos"] };
    nombre: string;
    clase: ClaseFirma;
    nivel: NivelFirma;
    mensaje?: string;
    dryRun: boolean;
    firmantes: FirmanteInput[];
  },
): Promise<FilaEnvioMasivo> {
  if (opts.dryRun) {
    return {
      personaId: opts.personaId,
      estado: "ok",
      nombre: opts.nombre,
      documentoId: null,
      solicitudFirmaId: null,
      mensaje: "Listo para generar y enviar.",
    };
  }
  const { documento } = await generarPdfLaboralPersona(
    ctx,
    opts.plantilla,
    opts.version,
    opts.persona,
    opts.relleno,
  );
  const solicitud = await ejecutarEnvioFirma(
    ctx,
    {
      documentoId: documento.id,
      clase: opts.clase,
      nivel: opts.nivel,
      ...(opts.mensaje ? { mensaje: opts.mensaje } : {}),
      firmantes: opts.firmantes,
    },
    false,
  );
  return {
    personaId: opts.personaId,
    estado: "ok",
    nombre: opts.nombre,
    documentoId: documento.id,
    solicitudFirmaId: solicitud.id,
    mensaje: null,
  };
}