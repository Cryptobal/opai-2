import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import { PROPOSITO_BIOMETRIA } from "./comun";

const estadoConsentimiento = (
  estado: string | undefined,
): "otorgado" | "revocado" | "sin_registro" =>
  estado === undefined ? "sin_registro" : estado === "otorgado" ? "otorgado" : "revocado";

export const biometriaEstado = defineCapability({
  id: "core.biometria.estado",
  descripcion:
    "Indica si una persona tiene su rostro enrolado para el reconocimiento facial y en qué estado está su consentimiento (otorgado, revocado o sin registro). Nunca devuelve la referencia ni datos biométricos.",
  permiso: PERMISOS_CORE.personasRead,
  input: z.object({ personaId: uuidSchema }),
  output: z.object({
    personaId: z.string(),
    enrolada: z.boolean(),
    proveedor: z.string().nullable(),
    enroladoEn: z.string().nullable(),
    consentimiento: z.enum(["otorgado", "revocado", "sin_registro"]),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => [salida.personaId],
  async handler(ctx, { personaId }) {
    const persona = await ctx.db.persona.findFirst({
      where: { id: personaId, ...dondePersona(ctx) },
      select: { id: true },
    });
    if (!persona) throw noEncontrado("La persona");
    const [fila, consentimiento] = await Promise.all([
      ctx.db.enrolamientoBiometrico.findUnique({
        where: { personaId },
        select: { proveedor: true, createdAt: true },
      }),
      ctx.db.consentimiento.findFirst({
        where: { titularTipo: "persona", titularId: personaId, proposito: PROPOSITO_BIOMETRIA },
        orderBy: { id: "desc" },
        select: { estado: true },
      }),
    ]);
    return {
      personaId,
      enrolada: fila !== null,
      proveedor: fila?.proveedor ?? null,
      enroladoEn: fila?.createdAt.toISOString() ?? null,
      consentimiento: estadoConsentimiento(consentimiento?.estado),
    };
  },
});
