import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";

/** La respuesta del navegador es entrada no confiable: se valida su forma antes de verificarla. */
const base64url = z
  .string()
  .max(4096)
  .regex(/^[A-Za-z0-9_-]*$/);
const respuestaBase = {
  id: base64url,
  rawId: base64url,
  type: z.literal("public-key"),
  clientExtensionResults: z.object({}),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
};
const respuestaEntrada = z.object({
  ...respuestaBase,
  response: z.object({
    clientDataJSON: base64url,
    authenticatorData: base64url,
    signature: base64url,
    userHandle: base64url.optional(),
  }),
});
export const respuestaRegistro = z.object({
  ...respuestaBase,
  response: z.object({
    clientDataJSON: base64url,
    attestationObject: z
      .string()
      .max(16384)
      .regex(/^[A-Za-z0-9_-]*$/),
    transports: z.array(z.string().max(20)).max(8).optional(),
  }),
});

/** Respuesta de autenticación validada, sin claves `undefined` (exactOptionalPropertyTypes). */
export function respuestaEntradaWebAuthn(v: unknown): AuthenticationResponseJSON | null {
  const r = respuestaEntrada.safeParse(v);
  if (!r.success) return null;
  const { userHandle, ...firma } = r.data.response;
  const { authenticatorAttachment, ...resto } = r.data;
  return {
    ...resto,
    ...(authenticatorAttachment ? { authenticatorAttachment } : {}),
    response: { ...firma, ...(userHandle ? { userHandle } : {}) },
  };
}
