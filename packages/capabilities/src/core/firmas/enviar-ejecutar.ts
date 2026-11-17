// Núcleo de `core.firmas.enviar` (CAR-633): compartido con el envío masivo de documentos laborales.
import { plazoVence, type ClaseFirma, type NivelFirma } from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { documentosEnAlcance } from "../documentos/alcance-doc";
import { filtroDocumentoSensible } from "../documentos/sensibles";
import { politicaEfectiva } from "./comun";
import { crearSolicitudFirma } from "./enviar-ejecutar-crear";
import { type FirmanteInput, validarFirmantes, validarNivelEnvio, vistaPreview } from "./enviar-util";

export type EnvioFirmaInput = {
  documentoId: string;
  clase: ClaseFirma;
  nivel: NivelFirma;
  orden?: "secuencial" | "paralelo" | undefined;
  plazoDias?: number | undefined;
  mensaje?: string | undefined;
  firmantes: readonly FirmanteInput[];
};

export async function ejecutarEnvioFirma(ctx: Contexto, input: EnvioFirmaInput, dryRun: boolean) {
  const permitidos = await documentosEnAlcance(ctx);
  const doc = await ctx.db.documento.findFirst({
    where: {
      ...filtroDocumentoSensible(ctx),
      id: input.documentoId,
      ...(permitidos ? { id: { in: [...permitidos].filter((id) => id === input.documentoId) } } : {}),
    },
  });
  if (!doc) throw noEncontrado("El documento");
  if (doc.estado !== "disponible" || !doc.sha256)
    throw reglaDeNegocio("Solo se envía a firma un documento disponible con su huella.");
  const fila = await ctx.db.politicaFirma.findUnique({
    where: { tenantId_clase: { tenantId: ctx.tenantId, clase: input.clase } },
  });
  const pol = politicaEfectiva(input.clase, fila);
  validarNivelEnvio(input.clase, input.nivel, pol);
  validarFirmantes(input.firmantes);
  const orden = input.orden ?? pol.orden;
  const vence = plazoVence(new Date(), input.plazoDias ?? pol.plazoDias);
  const base = {
    documentoId: doc.id,
    documentoVersion: doc.version,
    sha256: doc.sha256,
    clase: input.clase,
    nivel: input.nivel,
    orden,
    mensaje: input.mensaje ?? null,
    plazoVence: vence,
  };
  if (dryRun) return vistaPreview(base, input.firmantes);
  return crearSolicitudFirma(ctx, doc, { ...input, orden }, vence);
}