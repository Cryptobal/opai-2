import { z } from "zod";

import { enviarRequiereAprobacion, type ClaseFirma, type NivelFirma } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { claseSchema, nivelDisponibleSchema, ordenSchema, PLAZO_MAX } from "./comun";
import { PERMISO_FIRMAS_ENVIAR } from "./comun-flujo";
import { ejecutarEnvioFirma } from "./enviar-ejecutar";
import { firmanteInputSchema } from "./enviar-util";
import { solicitudVistaSchema } from "./vistas";

const ACTAS = new Set(["acta", "acta_reunion"]);

export const firmasEnviar = defineCapability({
  id: "core.firmas.enviar",
  descripcion:
    "Congela un documento (huella SHA-256, R4) y lo envía a firma con firmantes, orden, nivel y plazo. Un agente lo envía con aprobación humana, salvo los envíos N1 de actas y recepciones (firma.md R19, P12).",
  permiso: PERMISO_FIRMAS_ENVIAR,
  portales: ["erp", "supervisor"],
  input: z.object({
    documentoId: uuidSchema,
    clase: claseSchema,
    nivel: nivelDisponibleSchema,
    orden: ordenSchema.optional(),
    plazoDias: z.number().int().min(1).max(PLAZO_MAX).optional(),
    mensaje: z.string().trim().max(500).optional(),
    firmantes: z.array(firmanteInputSchema).min(1).max(20),
  }),
  output: solicitudVistaSchema,
  efecto: "irreversible",
  dryRun: true,
  // R19/P12: toda N2/N3 y las clases fuera de actas y recepciones piden aprobación a un agente.
  exigeAprobacion: (input) =>
    enviarRequiereAprobacion(input.clase as ClaseFirma, input.nivel as NivelFirma),
  async handler(ctx, input, { dryRun }) {
    // El supervisor solo envía actas a firma (firma.md §8); su alcance por instalación va abajo.
    if (ctx.rol === "supervisor" && !ACTAS.has(input.clase))
      throw reglaDeNegocio("El supervisor solo envía actas a firma (§8).");
    return ejecutarEnvioFirma(
      ctx,
      {
        documentoId: input.documentoId,
        clase: input.clase as ClaseFirma,
        nivel: input.nivel as NivelFirma,
        orden: input.orden,
        plazoDias: input.plazoDias,
        mensaje: input.mensaje,
        firmantes: input.firmantes,
      },
      dryRun,
    );
  },
});
