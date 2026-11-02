import type { AdaptadorSii } from "./tipos";
import { adaptadorSiiSimulado } from "./simulado";

/** En test y desarrollo usa el SII simulado; producción real pendiente de certificado del tenant. */
export function adaptadorSiiDesdeEntorno(env: NodeJS.ProcessEnv = process.env): AdaptadorSii {
  if (env.NODE_ENV === "test" || env.SII_ADAPTADOR === "simulado") return adaptadorSiiSimulado();
  // TODO(decisión Carlos): adaptador real SimpleAPI u otro proveedor cuando exista certificado postulado.
  return adaptadorSiiSimulado();
}
