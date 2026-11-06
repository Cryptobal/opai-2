import { z } from "zod";

import { biometriaDe, defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { exigirBiometriaPermitida } from "./biometria-comun";

export const biometriaIniciarVida = defineCapability({
  id: "asistencia.biometria.iniciar_vida",
  descripcion:
    "Abre una sesión de prueba de vida para enrolar o marcar con el rostro. La cámara del dispositivo la completa y su identificador se entrega después a la marca o al enrolamiento. Tiene costo por sesión y lo hace solo una persona.",
  permiso: null,
  portales: ["erp", "terreno", "trabajador"],
  soloPersonas: true,
  input: z.object({
    /** Solo con el proveedor simulado (pruebas y QA): qué rostro «ve» la cámara y si la prueba de vida pasa. Un proveedor real lo ignora. */
    simulacion: z.object({ rostro: z.string().trim().min(1).max(40), viva: z.boolean().default(true) }).optional(),
  }),
  output: z.object({ sesionVidaId: z.string(), proveedor: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    await exigirBiometriaPermitida(ctx);
    const bio = await biometriaDe(ctx);
    if (!bio) throw reglaDeNegocio("La biometría no está configurada en esta empresa.");
    if (dryRun) return { sesionVidaId: "", proveedor: bio.nombre };
    await bio.asegurarColeccion();
    return { sesionVidaId: (await bio.iniciarVida({ simulacion: i.simulacion })).sesionId, proveedor: bio.nombre };
  },
});
