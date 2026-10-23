import { crearContexto } from "@opai/capabilities";
import type { FabricaContexto } from "@opai/capabilities/http";

/**
 * Brief 00: sin autenticación. Fuera de producción se usa DEV_TENANT_ID con actor `system`.
 * En producción la API responde 503 hasta que el Brief 01 incorpore sesiones y API keys.
 */
export const fabricaContexto: FabricaContexto = async () => {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { ok: false, error: { code: "UNAVAILABLE", message: "La API se habilita en el Brief 01." } },
      { status: 503 },
    );
  }
  const tenantId = process.env["DEV_TENANT_ID"];
  if (!tenantId) {
    return Response.json(
      {
        ok: false,
        error: { code: "CONFIG", message: "Falta DEV_TENANT_ID en el entorno de desarrollo." },
      },
      { status: 503 },
    );
  }
  return crearContexto({ tenantId, actor: { tipo: "system" } });
};
