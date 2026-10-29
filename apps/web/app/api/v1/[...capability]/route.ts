import { manejarCapacidadHttp } from "@opai/capabilities/http";

import { resolverActor } from "@/lib/actor";
import { contextoV1Sesion } from "@/lib/api-v1-sesion";
import { ipDe, LIMITES, permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";
import { demasiadas } from "@/lib/respuestas";

asegurarRegistro();

type Params = { params: Promise<{ capability: string[] }> };

/**
 * API v1: autentica por sesión o API key y ejecuta la capacidad (Brief 01). Rate limit centralizado
 * (NÚCLEO-B): primero por IP (barrera barata antes de autenticar, acota el sondeo de keys), luego por
 * principal (API key o usuario). El actor se resuelve una sola vez y se reutiliza en el handler.
 * Con sesión, solo las capacidades de roles y permisos corren en el portal ERP fijado en servidor
 * (`lib/api-v1-sesion.ts`, CAR-37); el resto sigue con portal nulo.
 */
async function manejar(req: Request, { params }: Params): Promise<Response> {
  const { capability } = await params;
  if (!(await permitir(`v1-ip:${ipDe(req)}`, LIMITES.apiPorIp.maximo))) return demasiadas();
  const actor = await resolverActor(req);
  if (actor instanceof Response) return actor;
  const ctx = contextoV1Sesion(actor, capability.join("."), req);
  if (ctx instanceof Response) return ctx;
  const principal = ctx.actor.id ?? "sistema";
  if (!(await permitir(`v1-principal:${principal}`, LIMITES.apiPorPrincipal.maximo)))
    return demasiadas();
  return manejarCapacidadHttp(req, capability, async () => ctx);
}

export { manejar as GET, manejar as POST };
