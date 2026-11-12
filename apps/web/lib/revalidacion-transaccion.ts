import { prohibido, type Contexto } from "@opai/capabilities";
import { esRolPlataforma, mfaEsObligatoria, pendienteMfa } from "@opai/domain";

import type { Identidad } from "./actor";
import { accesoConModulos, sesionEnTransaccion } from "./fuentes";
import { crearRevalidacionAcceso } from "./revalidacion-acceso";

/** Sesión confiable capturada exclusivamente por la lectura fresca de Better Auth del servidor. */
type Lectura = { identidad: Identidad; sesionId?: string | undefined } | null;
const denegar = () => prohibido("Tu acceso cambió durante la solicitud. Vuelve a abrir el agente.");

async function identidadEnTx(tx: Contexto["db"], inicial: Identidad, sesionId: string) {
  const tenantId = inicial.actual?.tenantId;
  if (!tenantId) return null;
  const sesion = await sesionEnTransaccion(tx, sesionId, inicial.usuario.id);
  if (!sesion) return null;
  // No se listan otras empresas ni se elige una alternativa cuando desaparece la original.
  const actual = await tx.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId: inicial.usuario.id } },
    include: { tenant: true },
  });
  if (!actual) return null;
  const acceso = await accesoConModulos(tenantId, inicial.usuario.id, tx);
  return {
    ...inicial,
    ...acceso,
    actual,
    membresias: [actual],
    usuario: {
      ...inicial.usuario,
      platformRole: esRolPlataforma(sesion.platformRole) ? sesion.platformRole : null,
    },
    mfaActiva: sesion.mfaActiva,
    mfaVerificada: sesion.mfaVerificada,
  };
}

/** Dos caminos explícitos: auth fresca fuera de tx, lecturas en la misma conexión dentro de tx. */
export function conectarRevalidacion(
  ctx: Contexto,
  inicial: Identidad,
  portal: string | null,
  leer: () => Promise<Lectura>,
) {
  const original = structuredClone(inicial);
  let sesionId: string | undefined;
  ctx.revalidarAccesoSolicitud = async () => {
    const lectura = await leer();
    const hash = await crearRevalidacionAcceso(
      original,
      portal,
      async () => lectura?.identidad ?? null,
    )();
    const candidata = lectura?.sesionId;
    if (sesionId && candidata !== sesionId) throw denegar();
    sesionId = candidata;
    return hash;
  };
  ctx.revalidarAccesoEnTransaccion = async (tx) => {
    if (!sesionId) throw denegar();
    const vigenteId = sesionId;
    return crearRevalidacionAcceso(
      original,
      portal,
      () => identidadEnTx(tx, original, vigenteId),
      async (actual) =>
        pendienteMfa({
          activa: actual.mfaActiva,
          verificada: actual.mfaVerificada === true,
          obligatoria: mfaEsObligatoria(actual.usuario.platformRole),
        }),
    )();
  };
}
