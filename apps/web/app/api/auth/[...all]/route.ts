import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@opai/auth";

import { limiteOAuth } from "@/lib/oauth-limite";
import { ipDe, permitir } from "@/lib/rate-limit";
import { demasiadas } from "@/lib/respuestas";

// Better Auth (ADR-015): login, sesión, cierre, recuperación y el OAuth del MCP (CAR-247). Rate limit
// propio de la librería, más el límite central por IP de los extremos OAuth públicos.
const handler = toNextJsHandler(auth);

async function conLimite(req: Request, siguiente: (r: Request) => Promise<Response>) {
  const limite = limiteOAuth(req.method, new URL(req.url).pathname);
  if (
    limite &&
    !(await permitir(`${limite.ambito}:${ipDe(req)}`, limite.maximo, limite.ventanaMs, {
      fallarCerrado: limite.fallarCerrado,
    }))
  )
    return demasiadas(Math.ceil(limite.ventanaMs / 1000));
  return siguiente(req);
}

export const GET = (req: Request) => conLimite(req, handler.GET);
export const POST = (req: Request) => conLimite(req, handler.POST);
