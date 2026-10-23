import { asegurarNucleo } from "@opai/capabilities";
import { manejarCapacidadHttp } from "@opai/capabilities/http";

import { fabricaContexto } from "@/lib/contexto-http";

asegurarNucleo();

type Params = { params: Promise<{ capability: string[] }> };

async function manejar(req: Request, { params }: Params): Promise<Response> {
  const { capability } = await params;
  return manejarCapacidadHttp(req, capability, fabricaContexto);
}

export { manejar as GET, manejar as POST };
