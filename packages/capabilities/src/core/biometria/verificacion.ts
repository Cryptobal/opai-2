import { z } from "zod";

import { biometriaDelEntorno } from "@opai/integrations";
import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import {
  conProveedor,
  consentimientoVigente,
  descifrarReferencia,
  medir,
  muestraSchema,
  sinConsentimiento,
} from "./comun";

/** Similitud mínima (0–100) para dar por coincidente un rostro. */
const PUNTAJE_MINIMO = 90;

export const biometriaVerificar = defineCapability({
  id: "core.biometria.verificar",
  descripcion:
    "Verifica 1:1 que la muestra del rostro corresponde a la persona enrolada y que es una persona presente (prueba de vida). Exige su consentimiento vigente. Devuelve el resultado, nunca datos biométricos.",
  permiso: PERMISOS_CORE.personasRead,
  // La muestra es una imagen del rostro: no pasa por agentes ni por el MCP.
  soloPersonas: true,
  sensibles: ["muestra"],
  input: z.object({ personaId: uuidSchema, muestra: muestraSchema }),
  output: z.object({
    personaId: z.string(),
    verificado: z.boolean(),
    coincide: z.boolean(),
    vivo: z.boolean(),
    puntaje: z.number(),
    proveedor: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => [salida.personaId],
  async handler(ctx, { personaId, muestra }) {
    const persona = await ctx.db.persona.findFirst({
      where: { id: personaId, ...dondePersona(ctx), archivadaEn: null, anonimizadaEn: null },
      select: { id: true },
    });
    if (!persona) throw noEncontrado("La persona");
    if (!(await consentimientoVigente(ctx.db, personaId))) throw sinConsentimiento();
    const fila = await ctx.db.enrolamientoBiometrico.findUnique({ where: { personaId } });
    if (!fila) throw reglaDeNegocio("La persona no tiene su rostro enrolado. Marca con RUT y PIN.");
    const referencia = await descifrarReferencia(ctx, fila.referenciaCifrada);
    const r = await conProveedor(() => biometriaDelEntorno().verificar({ referencia, muestra }));
    await medir(ctx, "biometria.verificar", r.proveedor);
    return {
      personaId,
      verificado: r.coincide && r.vivo && r.puntaje >= PUNTAJE_MINIMO,
      coincide: r.coincide,
      vivo: r.vivo,
      puntaje: r.puntaje,
      proveedor: r.proveedor,
    };
  },
});
