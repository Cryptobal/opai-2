import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { arcoSolicitudSchema, crearSolicitudArcoPortal, tiposArcoPortalSchema } from "./arco-comun";

const PORTALES = ["trabajador"] as const;

export const arcoSolicitar = defineCapability({
  id: "portal_trabajador.arco.solicitar",
  descripcion:
    "Registra una solicitud de derechos del titular desde el portal del trabajador (rectificación, eliminación, oposición o bloqueo, Ley 21.719). Solo afecta a la persona vinculada al usuario; calcula el plazo de respuesta y avisa a la empresa. Acepta vista previa.",
  permiso: null,
  portales: PORTALES,
  input: z.object({
    tipo: tiposArcoPortalSchema,
    detalle: z.string().trim().min(1).max(2000),
    campos: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  }),
  output: arcoSolicitudSchema,
  efecto: "escritura",
  sensibles: ["detalle", "campos"],
  dryRun: true,
  sensibles: ["detalle", "campos"],
  async handler(ctx, input, { dryRun }) {
    return crearSolicitudArcoPortal(ctx, input, dryRun);
  },
});
