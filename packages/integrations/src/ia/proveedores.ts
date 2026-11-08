// IA por HTTP, sin SDKs (ADR-031, ADR-049). Punto de entrada: el contrato neutral, las utilidades
// HTTP y los adaptadores por proveedor. `proveedorIa(id, key, opts)` arma el adaptador; para los
// proveedores compatibles con OpenAI (xAI, Vercel AI Gateway, OpenRouter…) la base URL es
// configurable y `ia_xai` trae la pública por defecto.
export * from "./contrato";
export * from "./http";
export * from "./red-segura";
export { errorContinuidad } from "./anthropic-continuidad";
export { anthropic } from "./anthropic";
export { google } from "./google";
export { openai, openaiCompatible } from "./openai";

import type { ProveedorIa, ProveedorIaId } from "./contrato";
import { anthropic } from "./anthropic";
import { google } from "./google";
import { openaiCompatible } from "./openai";

const XAI_BASE_URL = "https://api.x.ai/v1";

export function proveedorIa(
  id: ProveedorIaId,
  apiKey: string,
  opts?: { baseUrl?: string },
): ProveedorIa {
  switch (id) {
    case "ia_anthropic":
      return anthropic(apiKey);
    case "ia_google":
      return google(apiKey);
    case "ia_openai":
      return openaiCompatible("ia_openai", apiKey, "https://api.openai.com/v1");
    case "ia_xai":
      return openaiCompatible("ia_xai", apiKey, opts?.baseUrl ?? XAI_BASE_URL);
    case "ia_compatible": {
      if (!opts?.baseUrl)
        throw new Error("El proveedor compatible con OpenAI necesita una base URL configurada.");
      // La base URL la trae la config del tenant: se valida (https + no interno, con DNS) por SSRF.
      return openaiCompatible("ia_compatible", apiKey, opts.baseUrl, { verificarDestino: true });
    }
  }
}
