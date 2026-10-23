import { manejarCapacidadHttp } from "@opai/capabilities/http";

import { resolverActor } from "@/lib/actor";
import { asegurarRegistro } from "@/lib/registro";

asegurarRegistro();

type Params = { params: Promise<{ capability: string[] }> };

/** API v1: autentica por sesión o API key y ejecuta la capacidad (Brief 01). */
async function manejar(req: Request, { params }: Params): Promise<Response> {
  const { capability } = await params;
  return manejarCapacidadHttp(req, capability, (r) => resolverActor(r));
}

export { manejar as GET, manejar as POST };
